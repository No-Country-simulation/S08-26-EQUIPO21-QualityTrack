import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import type { Mocked } from 'vitest';
import { StatusHistoryService } from './status-history.service';
import { StatusHistoryRepository } from './status-history.repository';
import { PrismaService } from '../../prisma/prisma.service';
import { WorkOrderEvent } from './work-order-event';
import { REPROCESS_LIMIT_REASON } from './work-order-state-machine';
import { WorkOrderStatus } from '../../generated/prisma/client';
import type { WorkOrder } from '../../generated/prisma/client';

const WO_ID = '33333333-3333-3333-3333-333333333333';
const USER_ID = '44444444-4444-4444-4444-444444444444';
const TX = { marker: 'tx' };

const buildWorkOrder = (over: Partial<WorkOrder> = {}): WorkOrder => ({
  id: WO_ID,
  quoteId: '11111111-1111-1111-1111-111111111111',
  status: WorkOrderStatus.created,
  createdAt: new Date('2026-09-09T10:00:00Z'),
  replacesWorkOrderId: null,
  ...over,
});

describe('StatusHistoryService', () => {
  let service: StatusHistoryService;
  let repo: Mocked<StatusHistoryRepository>;

  beforeEach(async () => {
    const repoMock: Partial<Mocked<StatusHistoryRepository>> = {
      findWorkOrderById: vi.fn(),
      countNonconforming: vi.fn(),
      updateWorkOrderStatus: vi.fn(),
      createHistoryEntry: vi.fn(),
      findByWorkOrderId: vi.fn(),
    };
    // $transaction ejecuta el callback con un tx dummy, como haría Prisma.
    const prismaMock = {
      $transaction: vi.fn((cb: (tx: unknown) => unknown) => cb(TX)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StatusHistoryService,
        { provide: StatusHistoryRepository, useValue: repoMock },
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = module.get(StatusHistoryService);
    repo = module.get(StatusHistoryRepository);
  });

  describe('transition — camino feliz', () => {
    it('actualiza work_order.status e inserta status_history en la misma transacción', async () => {
      repo.findWorkOrderById.mockResolvedValue(
        buildWorkOrder({ status: WorkOrderStatus.created }),
      );
      repo.updateWorkOrderStatus.mockResolvedValue(true);

      const result = await service.transition(
        WO_ID,
        WorkOrderEvent.Route,
        USER_ID,
      );

      expect(result).toEqual(
        buildWorkOrder({ status: WorkOrderStatus.routed }),
      );
      expect(repo.findWorkOrderById).toHaveBeenCalledWith(WO_ID, TX);
      expect(repo.updateWorkOrderStatus).toHaveBeenCalledWith(
        WO_ID,
        WorkOrderStatus.created,
        WorkOrderStatus.routed,
        TX,
      );
      expect(repo.createHistoryEntry).toHaveBeenCalledWith(
        {
          workOrderId: WO_ID,
          userId: USER_ID,
          previousStatus: WorkOrderStatus.created,
          newStatus: WorkOrderStatus.routed,
          reason: undefined,
        },
        TX,
      );
    });

    it('rechaza con 409 si otra transición concurrente ya cambió el status', async () => {
      repo.findWorkOrderById.mockResolvedValue(
        buildWorkOrder({ status: WorkOrderStatus.created }),
      );
      repo.updateWorkOrderStatus.mockResolvedValue(false);

      await expect(
        service.transition(WO_ID, WorkOrderEvent.Route, USER_ID),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(repo.createHistoryEntry).not.toHaveBeenCalled();
    });

    it('cada transición válida genera exactamente un registro de historial', async () => {
      const cases: Array<[WorkOrderStatus, WorkOrderEvent, WorkOrderStatus]> = [
        [WorkOrderStatus.created, WorkOrderEvent.Route, WorkOrderStatus.routed],
        [
          WorkOrderStatus.routed,
          WorkOrderEvent.StartProduction,
          WorkOrderStatus.in_production,
        ],
        [
          WorkOrderStatus.in_production,
          WorkOrderEvent.SendToQualityControl,
          WorkOrderStatus.in_quality_control,
        ],
        [
          WorkOrderStatus.in_quality_control,
          WorkOrderEvent.Deliver,
          WorkOrderStatus.delivered,
        ],
        [
          WorkOrderStatus.in_quality_control,
          WorkOrderEvent.MarkNonconforming,
          WorkOrderStatus.nonconforming,
        ],
      ];

      for (const [current, event, next] of cases) {
        repo.findWorkOrderById.mockResolvedValue(
          buildWorkOrder({ status: current }),
        );
        repo.updateWorkOrderStatus.mockResolvedValue(true);
        repo.createHistoryEntry.mockClear();

        await service.transition(WO_ID, event, USER_ID);

        expect(repo.createHistoryEntry).toHaveBeenCalledTimes(1);
        expect(repo.createHistoryEntry).toHaveBeenCalledWith(
          expect.objectContaining({ previousStatus: current, newStatus: next }),
          TX,
        );
      }
    });
  });

  describe('transition — evento inválido', () => {
    it('rechaza con 409 si el evento no es una transición legal desde el estado actual', async () => {
      repo.findWorkOrderById.mockResolvedValue(
        buildWorkOrder({ status: WorkOrderStatus.created }),
      );

      await expect(
        service.transition(WO_ID, WorkOrderEvent.Deliver, USER_ID),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(repo.updateWorkOrderStatus).not.toHaveBeenCalled();
      expect(repo.createHistoryEntry).not.toHaveBeenCalled();
    });

    it('rechaza con 404 si la OT no existe', async () => {
      repo.findWorkOrderById.mockResolvedValue(null);

      await expect(
        service.transition(WO_ID, WorkOrderEvent.Route, USER_ID),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(repo.updateWorkOrderStatus).not.toHaveBeenCalled();
    });
  });

  describe('transition — cancelación (ADR-0006)', () => {
    it('cancela con el reason recibido', async () => {
      repo.findWorkOrderById.mockResolvedValue(
        buildWorkOrder({ status: WorkOrderStatus.in_production }),
      );
      repo.updateWorkOrderStatus.mockResolvedValue(true);

      await service.transition(WO_ID, WorkOrderEvent.Cancel, USER_ID, {
        reason: 'El cliente canceló el pedido',
      });

      expect(repo.updateWorkOrderStatus).toHaveBeenCalledWith(
        WO_ID,
        WorkOrderStatus.in_production,
        WorkOrderStatus.cancelled,
        TX,
      );
      expect(repo.createHistoryEntry).toHaveBeenCalledWith(
        expect.objectContaining({ reason: 'El cliente canceló el pedido' }),
        TX,
      );
    });

    it('rechaza con 400 si falta el reason', async () => {
      repo.findWorkOrderById.mockResolvedValue(
        buildWorkOrder({ status: WorkOrderStatus.in_production }),
      );

      await expect(
        service.transition(WO_ID, WorkOrderEvent.Cancel, USER_ID),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(repo.updateWorkOrderStatus).not.toHaveBeenCalled();
    });

    it('nunca se cancela desde delivered', async () => {
      repo.findWorkOrderById.mockResolvedValue(
        buildWorkOrder({ status: WorkOrderStatus.delivered }),
      );

      await expect(
        service.transition(WO_ID, WorkOrderEvent.Cancel, USER_ID, {
          reason: 'no debería aplicar',
        }),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('transition — reproceso y su límite (ADR-0002 / ADR-0006)', () => {
    it('permite el reproceso mientras no se agotó el límite', async () => {
      repo.findWorkOrderById.mockResolvedValue(
        buildWorkOrder({ status: WorkOrderStatus.nonconforming }),
      );
      repo.countNonconforming.mockResolvedValue(3);
      repo.updateWorkOrderStatus.mockResolvedValue(true);

      await service.transition(WO_ID, WorkOrderEvent.Reprocess, USER_ID);

      expect(repo.updateWorkOrderStatus).toHaveBeenCalledWith(
        WO_ID,
        WorkOrderStatus.nonconforming,
        WorkOrderStatus.in_production,
        TX,
      );
      expect(repo.createHistoryEntry).toHaveBeenCalledWith(
        expect.objectContaining({
          newStatus: WorkOrderStatus.in_production,
          reason: undefined,
        }),
        TX,
      );
    });

    it('al agotar el límite, cancela automáticamente en la misma llamada en vez de rechazar', async () => {
      repo.findWorkOrderById.mockResolvedValue(
        buildWorkOrder({ status: WorkOrderStatus.nonconforming }),
      );
      repo.countNonconforming.mockResolvedValue(4);
      repo.updateWorkOrderStatus.mockResolvedValue(true);

      const result = await service.transition(
        WO_ID,
        WorkOrderEvent.Reprocess,
        USER_ID,
      );

      expect(result.status).toBe(WorkOrderStatus.cancelled);
      expect(repo.updateWorkOrderStatus).toHaveBeenCalledWith(
        WO_ID,
        WorkOrderStatus.nonconforming,
        WorkOrderStatus.cancelled,
        TX,
      );
      expect(repo.createHistoryEntry).toHaveBeenCalledWith(
        expect.objectContaining({
          newStatus: WorkOrderStatus.cancelled,
          reason: REPROCESS_LIMIT_REASON,
        }),
        TX,
      );
    });
  });

  describe('transition — con tx externo', () => {
    it('participa de la transacción recibida en vez de abrir la suya', async () => {
      const externalTx = { marker: 'external' };
      repo.findWorkOrderById.mockResolvedValue(
        buildWorkOrder({ status: WorkOrderStatus.created }),
      );
      repo.updateWorkOrderStatus.mockResolvedValue(true);
      const prisma = service['prisma'] as unknown as {
        $transaction: ReturnType<typeof vi.fn>;
      };

      await service.transition(WO_ID, WorkOrderEvent.Route, USER_ID, {
        tx: externalTx as never,
      });

      expect(prisma.$transaction).not.toHaveBeenCalled();
      expect(repo.findWorkOrderById).toHaveBeenCalledWith(WO_ID, externalTx);
      expect(repo.updateWorkOrderStatus).toHaveBeenCalledWith(
        WO_ID,
        WorkOrderStatus.created,
        WorkOrderStatus.routed,
        externalTx,
      );
      expect(repo.createHistoryEntry).toHaveBeenCalledWith(
        expect.objectContaining({ newStatus: WorkOrderStatus.routed }),
        externalTx,
      );
    });
  });

  describe('history', () => {
    it('delega en el repositorio', async () => {
      repo.findByWorkOrderId.mockResolvedValue([]);

      await service.history(WO_ID);

      expect(repo.findByWorkOrderId).toHaveBeenCalledWith(WO_ID);
    });
  });
});
