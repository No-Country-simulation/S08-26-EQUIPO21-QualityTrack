import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import type { Mocked } from 'vitest';
import { OperationsService } from './operations.service';
import { OperationsRepository } from './operations.repository';
import type { OperationWithRouteSheet } from './operations.repository';
import { StatusHistoryService } from '../status-history/status-history.service';
import { WorkOrderEvent } from '../status-history/work-order-event';
import { PrismaService } from '../../prisma/prisma.service';
import { WorkOrderStatus } from '../../generated/prisma/client';
import type { Operation, WorkOrder } from '../../generated/prisma/client';

const OPERATION_ID = '66666666-6666-6666-6666-666666666666';
const ROUTE_SHEET_ID = '55555555-5555-5555-5555-555555555555';
const WO_ID = '33333333-3333-3333-3333-333333333333';
const USER_ID = '44444444-4444-4444-4444-444444444444';

const buildOperation = (
  over: Partial<OperationWithRouteSheet> = {},
): OperationWithRouteSheet =>
  ({
    id: OPERATION_ID,
    routeSheetId: ROUTE_SHEET_ID,
    sequence: 1,
    type: 'Torneado',
    status: 'pending',
    startedByUserId: null,
    startedAt: null,
    finishedByUserId: null,
    finishedAt: null,
    updatedAt: new Date('2026-09-22T09:00:00Z'),
    routeSheet: {
      id: ROUTE_SHEET_ID,
      workOrderId: WO_ID,
      sequence: 1,
    },
    ...over,
  }) as unknown as OperationWithRouteSheet;

/**
 * La fila que `OperationsRepository.start`/`finish` devuelven — releída
 * dentro de la transacción, así que su `updatedAt` es el real posterior
 * al `updateMany` (no el de `buildOperation`, anterior al update).
 */
const buildUpdatedOperation = (over: Partial<Operation> = {}): Operation =>
  ({
    id: OPERATION_ID,
    routeSheetId: ROUTE_SHEET_ID,
    sequence: 1,
    type: 'Torneado',
    status: 'pending',
    startedByUserId: null,
    startedAt: null,
    finishedByUserId: null,
    finishedAt: null,
    updatedAt: new Date('2026-09-22T10:00:00Z'),
    ...over,
  }) as unknown as Operation;

const buildWorkOrder = (over: Partial<WorkOrder> = {}): WorkOrder =>
  ({
    id: WO_ID,
    quoteId: '11111111-1111-1111-1111-111111111111',
    status: WorkOrderStatus.routed,
    createdAt: new Date('2026-09-09T10:00:00Z'),
    replacesWorkOrderId: null,
    ...over,
  }) as WorkOrder;

describe('OperationsService', () => {
  let service: OperationsService;
  let repo: Mocked<OperationsRepository>;
  let statusHistory: Mocked<StatusHistoryService>;
  let tx: { workOrder: { findUniqueOrThrow: ReturnType<typeof vi.fn> } };

  beforeEach(async () => {
    const repoMock: Partial<Mocked<OperationsRepository>> = {
      findById: vi.fn(),
      start: vi.fn(),
      finish: vi.fn(),
      countNotPending: vi.fn(),
      countNotCompleted: vi.fn(),
    };
    const statusHistoryMock: Partial<Mocked<StatusHistoryService>> = {
      transition: vi.fn(),
    };
    // TX incluye `workOrder.findUniqueOrThrow`: lo usa
    // `transitionIdempotently` para decidir si un 409 de `transition()`
    // es una carrera benigna (la OT ya llegó al estado esperado) o un
    // conflicto real.
    tx = { workOrder: { findUniqueOrThrow: vi.fn() } };
    const prismaMock = {
      $transaction: vi.fn((cb: (tx: unknown) => unknown) => cb(tx)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OperationsService,
        { provide: OperationsRepository, useValue: repoMock },
        { provide: StatusHistoryService, useValue: statusHistoryMock },
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = module.get(OperationsService);
    repo = module.get(OperationsRepository);
    statusHistory = module.get(StatusHistoryService);
  });

  describe('start', () => {
    it('inicia la operación y, al ser la primera, transiciona routed -> in_production', async () => {
      repo.findById.mockResolvedValue(buildOperation());
      const updated = buildUpdatedOperation({
        status: 'in_progress',
        startedByUserId: USER_ID,
        startedAt: new Date('2026-09-22T10:00:00Z'),
      });
      repo.start.mockResolvedValue(updated);
      repo.countNotPending.mockResolvedValue(1);
      statusHistory.transition.mockResolvedValue({
        status: WorkOrderStatus.in_production,
      } as WorkOrder);

      const result = await service.start(OPERATION_ID, USER_ID);

      expect(result).toBe(updated);
      expect(repo.start).toHaveBeenCalledWith(
        OPERATION_ID,
        USER_ID,
        expect.any(Date),
        tx,
      );
      expect(repo.countNotPending).toHaveBeenCalledWith(ROUTE_SHEET_ID, tx);
      expect(statusHistory.transition).toHaveBeenCalledWith(
        WO_ID,
        WorkOrderEvent.StartProduction,
        USER_ID,
        { tx },
      );
    });

    it('no transiciona la OT si no es la primera operación en iniciar', async () => {
      repo.findById.mockResolvedValue(buildOperation());
      repo.start.mockResolvedValue(
        buildUpdatedOperation({ status: 'in_progress' }),
      );
      repo.countNotPending.mockResolvedValue(2);

      await service.start(OPERATION_ID, USER_ID);

      expect(statusHistory.transition).not.toHaveBeenCalled();
    });

    it('rechaza con 409 si la operación ya no está pendiente', async () => {
      repo.findById.mockResolvedValue(buildOperation());
      repo.start.mockResolvedValue(null);

      await expect(service.start(OPERATION_ID, USER_ID)).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(statusHistory.transition).not.toHaveBeenCalled();
    });

    it('rechaza con 404 si la operación no existe', async () => {
      repo.findById.mockResolvedValue(null);

      await expect(service.start(OPERATION_ID, USER_ID)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('no relanza el 409 de transition() si otra operación ya movió la OT a in_production (carrera benigna)', async () => {
      repo.findById.mockResolvedValue(buildOperation());
      const updated = buildUpdatedOperation({ status: 'in_progress' });
      repo.start.mockResolvedValue(updated);
      repo.countNotPending.mockResolvedValue(1);
      statusHistory.transition.mockRejectedValue(
        new ConflictException('carrera concurrente'),
      );
      tx.workOrder.findUniqueOrThrow.mockResolvedValue(
        buildWorkOrder({ status: WorkOrderStatus.in_production }),
      );

      await expect(service.start(OPERATION_ID, USER_ID)).resolves.toBe(updated);
      expect(tx.workOrder.findUniqueOrThrow).toHaveBeenCalledWith({
        where: { id: WO_ID },
      });
    });

    it('relanza el 409 de transition() si la OT terminó en otro estado (conflicto real, no una carrera benigna)', async () => {
      repo.findById.mockResolvedValue(buildOperation());
      repo.start.mockResolvedValue(
        buildUpdatedOperation({ status: 'in_progress' }),
      );
      repo.countNotPending.mockResolvedValue(1);
      statusHistory.transition.mockRejectedValue(
        new ConflictException('la OT ya no está routed'),
      );
      tx.workOrder.findUniqueOrThrow.mockResolvedValue(
        buildWorkOrder({ status: WorkOrderStatus.cancelled }),
      );

      await expect(service.start(OPERATION_ID, USER_ID)).rejects.toBeInstanceOf(
        ConflictException,
      );
    });
  });

  describe('finish', () => {
    it('completa la operación y, al ser la última, transiciona in_production -> in_quality_control', async () => {
      repo.findById.mockResolvedValue(
        buildOperation({ status: 'in_progress' }),
      );
      const updated = buildUpdatedOperation({
        status: 'completed',
        finishedByUserId: USER_ID,
        finishedAt: new Date('2026-09-22T10:00:00Z'),
      });
      repo.finish.mockResolvedValue(updated);
      repo.countNotCompleted.mockResolvedValue(0);
      statusHistory.transition.mockResolvedValue({
        status: WorkOrderStatus.in_quality_control,
      } as WorkOrder);

      const result = await service.finish(OPERATION_ID, USER_ID);

      expect(result).toBe(updated);
      expect(repo.countNotCompleted).toHaveBeenCalledWith(ROUTE_SHEET_ID, tx);
      expect(statusHistory.transition).toHaveBeenCalledWith(
        WO_ID,
        WorkOrderEvent.SendToQualityControl,
        USER_ID,
        { tx },
      );
    });

    it('bloquea el paso a control de calidad mientras queden operaciones sin completar', async () => {
      repo.findById.mockResolvedValue(
        buildOperation({ status: 'in_progress' }),
      );
      repo.finish.mockResolvedValue(
        buildUpdatedOperation({ status: 'completed' }),
      );
      repo.countNotCompleted.mockResolvedValue(1);

      await service.finish(OPERATION_ID, USER_ID);

      expect(statusHistory.transition).not.toHaveBeenCalled();
    });

    it('rechaza con 409 si la operación no está en curso', async () => {
      repo.findById.mockResolvedValue(
        buildOperation({ status: 'in_progress' }),
      );
      repo.finish.mockResolvedValue(null);

      await expect(
        service.finish(OPERATION_ID, USER_ID),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('rechaza con 404 si la operación no existe', async () => {
      repo.findById.mockResolvedValue(null);

      await expect(
        service.finish(OPERATION_ID, USER_ID),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('no relanza el 409 de transition() si otra operación ya movió la OT a in_quality_control (carrera benigna)', async () => {
      repo.findById.mockResolvedValue(
        buildOperation({ status: 'in_progress' }),
      );
      const updated = buildUpdatedOperation({ status: 'completed' });
      repo.finish.mockResolvedValue(updated);
      repo.countNotCompleted.mockResolvedValue(0);
      statusHistory.transition.mockRejectedValue(
        new ConflictException('carrera concurrente'),
      );
      tx.workOrder.findUniqueOrThrow.mockResolvedValue(
        buildWorkOrder({ status: WorkOrderStatus.in_quality_control }),
      );

      await expect(service.finish(OPERATION_ID, USER_ID)).resolves.toBe(
        updated,
      );
    });

    it('relanza el 409 de transition() si la OT terminó en otro estado (conflicto real, no una carrera benigna)', async () => {
      repo.findById.mockResolvedValue(
        buildOperation({ status: 'in_progress' }),
      );
      repo.finish.mockResolvedValue(
        buildUpdatedOperation({ status: 'completed' }),
      );
      repo.countNotCompleted.mockResolvedValue(0);
      statusHistory.transition.mockRejectedValue(
        new ConflictException('la OT ya no está in_production'),
      );
      tx.workOrder.findUniqueOrThrow.mockResolvedValue(
        buildWorkOrder({ status: WorkOrderStatus.cancelled }),
      );

      await expect(
        service.finish(OPERATION_ID, USER_ID),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });
});
