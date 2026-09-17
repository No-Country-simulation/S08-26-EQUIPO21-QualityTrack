import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma, WorkOrderStatus } from '../../generated/prisma/client';
import type { StatusHistory, WorkOrder } from '../../generated/prisma/client';

/**
 * Acceso a datos de `work_order.status` y `status_history`.
 * Por ADR-0005, este repositorio es el único que actualiza
 * `work_order.status` e inserta filas en `status_history` (el alta
 * inicial con `status = created` vive en `work-orders`). No expone
 * `update` ni `delete` sobre `status_history`: es append-only.
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

  /**
   * Actualiza `work_order.status` con optimistic concurrency: el `WHERE`
   * exige que el status siga siendo `previousStatus`. Si otra transición
   * concurrente ya movió la OT, `updateMany` no afecta filas y devuelve
   * `false` — el llamador debe tratarlo como conflicto, no reintentar a
   * ciegas sobre un estado que ya no es el que se validó.
   */
  async updateWorkOrderStatus(
    workOrderId: string,
    previousStatus: WorkOrderStatus,
    newStatus: WorkOrderStatus,
    tx?: Prisma.TransactionClient,
  ): Promise<boolean> {
    const { count } = await (tx ?? this.prisma).workOrder.updateMany({
      where: { id: workOrderId, status: previousStatus },
      data: { status: newStatus },
    });
    return count === 1;
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
