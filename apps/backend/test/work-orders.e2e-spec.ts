import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

/**
 * Integración end-to-end de la hoja de ruta y las operaciones (Épica 6,
 * issue #31). Levanta el `AppModule` completo contra el PostgreSQL de
 * `compose.yml` — misma dependencia de infra que
 * `test/quotes.e2e-spec.ts`.
 *
 * Cubre el camino más riesgoso del módulo: dar de alta la hoja de ruta
 * transiciona `created -> routed` en la misma transacción; iniciar la
 * primera operación dispara `routed -> in_production`; completar la
 * última dispara `in_production -> in_quality_control` — todo sin que
 * nadie llame `transition()` a mano desde afuera de `status-history`.
 *
 * El `AppModule` de e2e no aplica `setGlobalPrefix` ni el
 * `ValidationPipe` global (viven en `main.ts`), así que las rutas van
 * sin `/api/v1`.
 */
describe('Hoja de ruta y operaciones (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  let customerId: string;
  let requestId: string;
  let quoteId: string;
  let workOrderId: string;
  let userId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    prisma = app.get(PrismaService);
  });

  beforeEach(async () => {
    const user = await prisma.appUser.create({
      data: { name: 'Operario de Planta', role: 'planta' },
    });
    userId = user.id;

    const customer = await prisma.customer.create({
      data: {
        name: 'Mecánica Sur SA',
        taxId: `30-${crypto.randomUUID()}`,
        email: 'compras@sur.example',
      },
    });
    customerId = customer.id;
    const req = await prisma.request.create({
      data: { customerId, piece: 'Eje de acero', quantity: 20 },
    });
    requestId = req.id;
    const quote = await prisma.quote.create({
      data: {
        requestId,
        status: 'pending_approval',
        amount: 999,
        commitmentDate: new Date('2026-10-15'),
      },
    });
    quoteId = quote.id;

    const approve = await request(app.getHttpServer())
      .patch(`/quotes/${quoteId}/approve`)
      .expect(200);
    workOrderId = approve.body.workOrder.id;
  });

  afterEach(async () => {
    // Orden inverso a las FKs (onDelete: Restrict).
    await prisma.statusHistory.deleteMany({ where: { workOrderId } });
    await prisma.operation.deleteMany({
      where: { routeSheet: { workOrderId } },
    });
    await prisma.routeSheet.deleteMany({ where: { workOrderId } });
    await prisma.workOrder.deleteMany({ where: { quoteId } });
    await prisma.quote.deleteMany({ where: { requestId } });
    await prisma.request.deleteMany({ where: { id: requestId } });
    await prisma.customer.deleteMany({ where: { id: customerId } });
    await prisma.appUser.deleteMany({ where: { id: userId } });
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /work-orders/:id/route-sheet crea la hoja de ruta y transiciona a routed', async () => {
    const res = await request(app.getHttpServer())
      .post(`/work-orders/${workOrderId}/route-sheet`)
      .send({ operations: [{ type: 'Torneado' }, { type: 'Fresado' }], userId })
      .expect(201);

    expect(res.body.operations).toHaveLength(2);
    expect(res.body.operations[0]).toMatchObject({
      sequence: 1,
      type: 'Torneado',
      status: 'pending',
    });
    expect(res.body.operations[1]).toMatchObject({
      sequence: 2,
      type: 'Fresado',
    });

    const workOrder = await prisma.workOrder.findUniqueOrThrow({
      where: { id: workOrderId },
    });
    expect(workOrder.status).toBe('routed');

    const history = await prisma.statusHistory.findMany({
      where: { workOrderId },
    });
    expect(history).toHaveLength(1);
    expect(history[0]).toMatchObject({
      previousStatus: 'created',
      newStatus: 'routed',
    });
  });

  it('POST /work-orders/:id/route-sheet -> 409 si ya tiene una hoja de ruta', async () => {
    await request(app.getHttpServer())
      .post(`/work-orders/${workOrderId}/route-sheet`)
      .send({ operations: [{ type: 'Torneado' }], userId })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/work-orders/${workOrderId}/route-sheet`)
      .send({ operations: [{ type: 'Fresado' }], userId })
      .expect(409);
  });

  it('GET /work-orders/:id/route-sheet -> 404 si todavía no tiene una', async () => {
    await request(app.getHttpServer())
      .get(`/work-orders/${workOrderId}/route-sheet`)
      .expect(404);
  });

  it('GET /work-orders devuelve la OT con cliente, pieza y fecha de compromiso', async () => {
    const res = await request(app.getHttpServer())
      .get('/work-orders')
      .expect(200);

    const found = res.body.find((wo: { id: string }) => wo.id === workOrderId);
    expect(found).toMatchObject({
      status: 'created',
      quote: {
        id: quoteId,
        commitmentDate: expect.any(String),
        request: {
          piece: 'Eje de acero',
          quantity: 20,
          customer: { id: customerId, name: 'Mecánica Sur SA' },
        },
      },
    });
  });

  it('GET /work-orders?status= filtra por estado — refleja routed tras dar de alta la hoja de ruta', async () => {
    await request(app.getHttpServer())
      .post(`/work-orders/${workOrderId}/route-sheet`)
      .send({ operations: [{ type: 'Torneado' }], userId })
      .expect(201);

    const created = await request(app.getHttpServer())
      .get('/work-orders')
      .query({ status: 'created' })
      .expect(200);
    expect(
      created.body.some((wo: { id: string }) => wo.id === workOrderId),
    ).toBe(false);

    const routed = await request(app.getHttpServer())
      .get('/work-orders')
      .query({ status: 'routed' })
      .expect(200);
    expect(
      routed.body.some((wo: { id: string }) => wo.id === workOrderId),
    ).toBe(true);
  });

  describe('con una hoja de ruta de 2 operaciones', () => {
    let operationIds: string[];

    beforeEach(async () => {
      const res = await request(app.getHttpServer())
        .post(`/work-orders/${workOrderId}/route-sheet`)
        .send({
          operations: [{ type: 'Torneado' }, { type: 'Fresado' }],
          userId,
        })
        .expect(201);
      operationIds = res.body.operations.map((op: { id: string }) => op.id);
    });

    it('iniciar la primera operación mueve la OT a in_production', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/operations/${operationIds[0]}/start`)
        .send({ userId })
        .expect(200);

      expect(res.body).toMatchObject({
        status: 'in_progress',
        startedByUserId: userId,
      });

      const workOrder = await prisma.workOrder.findUniqueOrThrow({
        where: { id: workOrderId },
      });
      expect(workOrder.status).toBe('in_production');
    });

    it('PATCH .../start -> 409 si la operación ya no está pendiente', async () => {
      await request(app.getHttpServer())
        .patch(`/operations/${operationIds[0]}/start`)
        .send({ userId })
        .expect(200);

      await request(app.getHttpServer())
        .patch(`/operations/${operationIds[0]}/start`)
        .send({ userId })
        .expect(409);
    });

    it('bloquea el paso a control de calidad mientras queden operaciones sin completar', async () => {
      await request(app.getHttpServer())
        .patch(`/operations/${operationIds[0]}/start`)
        .send({ userId })
        .expect(200);
      await request(app.getHttpServer())
        .patch(`/operations/${operationIds[0]}/finish`)
        .send({ userId })
        .expect(200);

      const workOrder = await prisma.workOrder.findUniqueOrThrow({
        where: { id: workOrderId },
      });
      // Queda la segunda operación pendiente -> nunca se llamó SendToQualityControl.
      expect(workOrder.status).toBe('in_production');
    });

    it('completar la última operación mueve la OT a in_quality_control automáticamente', async () => {
      for (const operationId of operationIds) {
        await request(app.getHttpServer())
          .patch(`/operations/${operationId}/start`)
          .send({ userId })
          .expect(200);
        await request(app.getHttpServer())
          .patch(`/operations/${operationId}/finish`)
          .send({ userId })
          .expect(200);
      }

      const workOrder = await prisma.workOrder.findUniqueOrThrow({
        where: { id: workOrderId },
      });
      expect(workOrder.status).toBe('in_quality_control');

      const history = await prisma.statusHistory.findMany({
        where: { workOrderId },
        orderBy: { changedAt: 'asc' },
      });
      expect(history.map((h) => h.newStatus)).toEqual([
        'routed',
        'in_production',
        'in_quality_control',
      ]);

      const routeSheet = await request(app.getHttpServer())
        .get(`/work-orders/${workOrderId}/route-sheet`)
        .expect(200);
      expect(
        routeSheet.body.operations.every(
          (op: { status: string }) => op.status === 'completed',
        ),
      ).toBe(true);
    });
  });
});
