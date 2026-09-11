import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

/**
 * Integración end-to-end del ciclo de la cotización (issue #27). Levanta
 * el AppModule completo contra el PostgreSQL de `compose.yml` — misma
 * dependencia de infra que `test/health.e2e-spec.ts`.
 *
 * Cubre el camino más riesgoso del módulo: aprobar una cotización mueve
 * el estado y crea la OT original en la misma transacción, y el índice
 * único parcial `work_order_quote_id_original_key` (ADR-0001) impide una
 * segunda OT original para la misma cotización.
 *
 * El AppModule de e2e no aplica `setGlobalPrefix` ni el `ValidationPipe`
 * global (viven en `main.ts`), así que las rutas van sin `/api/v1`.
 */
describe('Cotizaciones (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  let customerId: string;
  let requestId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    prisma = app.get(PrismaService);
  });

  beforeEach(async () => {
    const customer = await prisma.customer.create({
      data: {
        name: 'Mecánica Sur SA',
        taxId: `30-${Date.now()}-9`,
        email: 'compras@sur.example',
      },
    });
    customerId = customer.id;
    const req = await prisma.request.create({
      data: { customerId, description: 'Torneado de 20 ejes de acero' },
    });
    requestId = req.id;
  });

  afterEach(async () => {
    // Orden inverso a las FKs (onDelete: Restrict).
    await prisma.statusHistory.deleteMany({
      where: { workOrder: { quote: { requestId } } },
    });
    await prisma.workOrder.deleteMany({ where: { quote: { requestId } } });
    await prisma.quote.deleteMany({ where: { requestId } });
    await prisma.request.deleteMany({ where: { id: requestId } });
    await prisma.customer.deleteMany({ where: { id: customerId } });
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /quotes crea la cotización en pending_approval y la vincula a la solicitud', async () => {
    const res = await request(app.getHttpServer())
      .post('/quotes')
      .send({ requestId, amount: 15000.5 })
      .expect(201);

    expect(res.body).toMatchObject({
      requestId,
      status: 'pending_approval',
      amount: '15000.5',
    });
  });

  it('POST /quotes -> 404 si la solicitud no existe', async () => {
    await request(app.getHttpServer())
      .post('/quotes')
      .send({ requestId: '00000000-0000-0000-0000-000000000000', amount: 100 })
      .expect(404);
  });

  it('POST /quotes -> 409 si la solicitud ya tiene una cotización', async () => {
    await prisma.quote.create({
      data: { requestId, status: 'pending_approval', amount: 100 },
    });

    await request(app.getHttpServer())
      .post('/quotes')
      .send({ requestId, amount: 200 })
      .expect(409);
  });

  it('PATCH /quotes/:id/approve mueve a approved y genera la OT original', async () => {
    const quote = await prisma.quote.create({
      data: { requestId, status: 'pending_approval', amount: 999 },
    });

    const res = await request(app.getHttpServer())
      .patch(`/quotes/${quote.id}/approve`)
      .expect(200);

    expect(res.body.status).toBe('approved');
    expect(res.body.workOrder).toMatchObject({
      quoteId: quote.id,
      status: 'created',
      replacesWorkOrderId: null,
    });

    const workOrders = await prisma.workOrder.findMany({
      where: { quoteId: quote.id },
    });
    expect(workOrders).toHaveLength(1);
  });

  it('PATCH /quotes/:id/approve -> 409 si ya no está en pending_approval (no crea otra OT)', async () => {
    const quote = await prisma.quote.create({
      data: { requestId, status: 'pending_approval', amount: 999 },
    });
    await request(app.getHttpServer())
      .patch(`/quotes/${quote.id}/approve`)
      .expect(200);

    await request(app.getHttpServer())
      .patch(`/quotes/${quote.id}/approve`)
      .expect(409);

    const workOrders = await prisma.workOrder.findMany({
      where: { quoteId: quote.id },
    });
    expect(workOrders).toHaveLength(1);
  });

  it('PATCH /quotes/:id/reject mueve a rejected y no genera OT', async () => {
    const quote = await prisma.quote.create({
      data: { requestId, status: 'pending_approval', amount: 999 },
    });

    const res = await request(app.getHttpServer())
      .patch(`/quotes/${quote.id}/reject`)
      .expect(200);

    expect(res.body.status).toBe('rejected');
    const workOrders = await prisma.workOrder.findMany({
      where: { quoteId: quote.id },
    });
    expect(workOrders).toHaveLength(0);
  });

  it('GET /quotes/commercial-panel devuelve solicitudes sin cotizar y cotizaciones pendientes', async () => {
    const quoted = await prisma.request.create({
      data: { customerId, description: 'Fresado de bridas' },
    });
    const pendingQuote = await prisma.quote.create({
      data: { requestId: quoted.id, status: 'pending_approval', amount: 500 },
    });

    const res = await request(app.getHttpServer())
      .get('/quotes/commercial-panel')
      .expect(200);

    const pendingRequestIds = res.body.requestsPendingQuote.map(
      (r: { id: string }) => r.id,
    );
    const pendingQuoteIds = res.body.quotesPendingApproval.map(
      (q: { id: string }) => q.id,
    );
    expect(pendingRequestIds).toContain(requestId);
    expect(pendingRequestIds).not.toContain(quoted.id);
    expect(pendingQuoteIds).toContain(pendingQuote.id);

    await prisma.quote.deleteMany({ where: { requestId: quoted.id } });
    await prisma.request.deleteMany({ where: { id: quoted.id } });
  });
});
