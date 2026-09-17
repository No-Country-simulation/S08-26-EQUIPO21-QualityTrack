import { Test, TestingModule } from '@nestjs/testing';
import { StatusHistoryRepository } from './status-history.repository';
import { PrismaService } from '../../prisma/prisma.service';
import { WorkOrderStatus } from '../../generated/prisma/client';
import type { WorkOrder } from '../../generated/prisma/client';

const WO_ID = '33333333-3333-3333-3333-333333333333';
const USER_ID = '44444444-4444-4444-4444-444444444444';

const buildWorkOrder = (over: Partial<WorkOrder> = {}): WorkOrder => ({
  id: WO_ID,
  quoteId: '11111111-1111-1111-1111-111111111111',
  status: WorkOrderStatus.created,
  createdAt: new Date('2026-09-09T10:00:00Z'),
  replacesWorkOrderId: null,
  ...over,
});

describe('StatusHistoryRepository', () => {
  let repo: StatusHistoryRepository;
  let prisma: {
    workOrder: {
      findUnique: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
    };
    statusHistory: {
      count: ReturnType<typeof vi.fn>;
      create: ReturnType<typeof vi.fn>;
      findMany: ReturnType<typeof vi.fn>;
    };
  };

  beforeEach(async () => {
    prisma = {
      workOrder: { findUnique: vi.fn(), update: vi.fn() },
      statusHistory: { count: vi.fn(), create: vi.fn(), findMany: vi.fn() },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StatusHistoryRepository,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    repo = module.get(StatusHistoryRepository);
  });

  describe('findWorkOrderById', () => {
    it('usa el cliente Prisma por defecto sin transaction client', async () => {
      const wo = buildWorkOrder();
      prisma.workOrder.findUnique.mockResolvedValue(wo);

      await expect(repo.findWorkOrderById(WO_ID)).resolves.toBe(wo);
      expect(prisma.workOrder.findUnique).toHaveBeenCalledWith({
        where: { id: WO_ID },
      });
    });

    it('usa el transaction client cuando se le pasa uno', async () => {
      const wo = buildWorkOrder();
      const tx = {
        workOrder: { findUnique: vi.fn().mockResolvedValue(wo) },
      } as never;

      await repo.findWorkOrderById(WO_ID, tx);

      expect(
        (tx as { workOrder: { findUnique: ReturnType<typeof vi.fn> } })
          .workOrder.findUnique,
      ).toHaveBeenCalledWith({ where: { id: WO_ID } });
      expect(prisma.workOrder.findUnique).not.toHaveBeenCalled();
    });
  });

  describe('countNonconforming', () => {
    it('cuenta las filas de status_history con new_status = nonconforming para la OT', async () => {
      prisma.statusHistory.count.mockResolvedValue(2);

      await expect(repo.countNonconforming(WO_ID)).resolves.toBe(2);
      expect(prisma.statusHistory.count).toHaveBeenCalledWith({
        where: { workOrderId: WO_ID, newStatus: WorkOrderStatus.nonconforming },
      });
    });
  });

  describe('updateWorkOrderStatus', () => {
    it('actualiza work_order.status', async () => {
      const updated = buildWorkOrder({ status: WorkOrderStatus.routed });
      prisma.workOrder.update.mockResolvedValue(updated);

      await expect(
        repo.updateWorkOrderStatus(WO_ID, WorkOrderStatus.routed),
      ).resolves.toBe(updated);
      expect(prisma.workOrder.update).toHaveBeenCalledWith({
        where: { id: WO_ID },
        data: { status: WorkOrderStatus.routed },
      });
    });
  });

  describe('createHistoryEntry', () => {
    it('inserta la fila de status_history con los datos recibidos', async () => {
      const data = {
        workOrderId: WO_ID,
        userId: USER_ID,
        previousStatus: WorkOrderStatus.created,
        newStatus: WorkOrderStatus.routed,
      };
      prisma.statusHistory.create.mockResolvedValue({ id: 'sh-1', ...data });

      await repo.createHistoryEntry(data);

      expect(prisma.statusHistory.create).toHaveBeenCalledWith({ data });
    });
  });

  describe('findByWorkOrderId', () => {
    it('devuelve el historial ordenado cronológicamente', async () => {
      prisma.statusHistory.findMany.mockResolvedValue([]);

      await repo.findByWorkOrderId(WO_ID);

      expect(prisma.statusHistory.findMany).toHaveBeenCalledWith({
        where: { workOrderId: WO_ID },
        orderBy: { changedAt: 'asc' },
      });
    });
  });
});
