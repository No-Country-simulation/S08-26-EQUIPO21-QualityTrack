import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma, WorkOrderStatus } from '../../generated/prisma/client';
import type { StatusHistory, WorkOrder } from '../../generated/prisma/client';

/**
 * Acceso a datos de `work_order.status` y `status_history` — las dos
 * columnas/tabla que, por ADR-0005, solo este repositorio toca. No
 * expone `update` ni `delete` sobre `status_history`: es append-only.
 *
 * Los métodos que participan de una transición aceptan un
 * `Prisma.TransactionClient` opcional: `StatusHistoryService.transition()`
 * los llama a todos dentro del mismo `prisma.$transaction` (regla de
 * `CLAUDE.md`).
 */
@Injectable()
export class StatusHistoryRepository {
  constructor(private readonly prisma: PrismaService) {}

  findWorkOrderById(
    id: string,
    tx?: Prisma.TransactionClient,
  ): Promise<WorkOrder | null> {
    return (tx ?? this.prisma).workOrder.findUnique({ where: { id } });
  }

  /**
   * Total de filas `status_history` con `new_status = nonconforming`
   * para una OT — la cuenta de reprocesos que exige ADR-0002.
   */
  countNonconforming(
    workOrderId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<number> {
    return (tx ?? this.prisma).statusHistory.count({
      where: { workOrderId, newStatus: WorkOrderStatus.nonconforming },
    });
  }

  updateWorkOrderStatus(
    workOrderId: string,
    status: WorkOrderStatus,
    tx?: Prisma.TransactionClient,
  ): Promise<WorkOrder> {
    return (tx ?? this.prisma).workOrder.update({
      where: { id: workOrderId },
      data: { status },
    });
  }

  createHistoryEntry(
    data: {
      workOrderId: string;
      userId: string;
      previousStatus: WorkOrderStatus;
      newStatus: WorkOrderStatus;
      reason?: string;
    },
    tx?: Prisma.TransactionClient,
  ): Promise<StatusHistory> {
    return (tx ?? this.prisma).statusHistory.create({ data });
  }

  /** Historial completo de una OT, cronológico — lo consume `dossier`. */
  findByWorkOrderId(workOrderId: string): Promise<StatusHistory[]> {
    return this.prisma.statusHistory.findMany({
      where: { workOrderId },
      orderBy: { changedAt: 'asc' },
    });
  }
}
