import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { StatusHistoryRepository } from './status-history.repository';
import { WorkOrderEvent } from './work-order-event';
import {
  getNextStatus,
  hasReachedReprocessLimit,
  REPROCESS_LIMIT_REASON,
} from './work-order-state-machine';
import { WorkOrderStatus } from '../../generated/prisma/client';
import type {
  Prisma,
  StatusHistory,
  WorkOrder,
} from '../../generated/prisma/client';

export interface TransitionOptions {
  /** Motivo de la cancelación (ADR-0006). Obligatorio si `event` es `Cancel`. */
  reason?: string;
  /**
   * Transacción externa de la que esta transición debe participar (p. ej.
   * crear la hoja de ruta + `created -> routed` en un solo
   * `prisma.$transaction`, o completar la última operación +
   * `in_production -> in_quality_control`, ver módulo `work-orders`).
   * Sin esto, `transition()` abre su propia transacción — comportamiento
   * sin cambios para los callers existentes.
   */
  tx?: Prisma.TransactionClient;
}

/**
 * Único módulo con permiso de escritura sobre `work_order.status` y
 * `status_history` (ADR-0005). Todo cambio de estado de una `WORK_ORDER`
 * pasa por `transition()` — ningún otro módulo actualiza `status` a
 * mano ni inserta en `status_history` directamente.
 */
@Injectable()
export class StatusHistoryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly repository: StatusHistoryRepository,
  ) {}

  /**
   * Valida que `event` sea una transición legal desde el estado actual
   * de la OT (`work-order-state-machine.ts`), cierra el ciclo de
   * reproceso agotado (ADR-0002/ADR-0006), y aplica el cambio de estado
   * + el insert en `status_history` en una sola transacción — ante
   * error, rollback conjunto.
   *
   * Con `options.tx` participa de una transacción ya abierta por el
   * caller en vez de abrir la suya propia (ver `TransitionOptions.tx`).
   */
  async transition(
    workOrderId: string,
    event: WorkOrderEvent,
    userId: string,
    options: TransitionOptions = {},
  ): Promise<WorkOrder> {
    if (options.tx) {
      return this.runTransition(
        options.tx,
        workOrderId,
        event,
        userId,
        options,
      );
    }
    return this.prisma.$transaction((tx) =>
      this.runTransition(tx, workOrderId, event, userId, options),
    );
  }

  private async runTransition(
    tx: Prisma.TransactionClient,
    workOrderId: string,
    event: WorkOrderEvent,
    userId: string,
    options: TransitionOptions,
  ): Promise<WorkOrder> {
    const workOrder = await this.repository.findWorkOrderById(workOrderId, tx);
    if (workOrder === null) {
      throw new NotFoundException(
        `No existe una orden de trabajo con id "${workOrderId}".`,
      );
    }

    const previousStatus = workOrder.status;
    let newStatus = getNextStatus(previousStatus, event);
    let reason = options.reason;

    if (event === WorkOrderEvent.Reprocess && newStatus !== undefined) {
      const nonconformingCount = await this.repository.countNonconforming(
        workOrderId,
        tx,
      );
      if (hasReachedReprocessLimit(nonconformingCount)) {
        // ADR-0006: el reproceso que se rechaza por límite agotado
        // cierra el ciclo automáticamente, en la misma llamada.
        newStatus = WorkOrderStatus.cancelled;
        reason = REPROCESS_LIMIT_REASON;
      }
    }

    if (newStatus === undefined) {
      throw new ConflictException(
        `El evento "${event}" no es una transición válida desde el ` +
          `estado "${previousStatus}".`,
      );
    }

    if (newStatus === WorkOrderStatus.cancelled && !reason) {
      throw new BadRequestException(
        'Cancelar una orden de trabajo requiere un motivo (reason).',
      );
    }

    const applied = await this.repository.updateWorkOrderStatus(
      workOrderId,
      previousStatus,
      newStatus,
      tx,
    );
    if (!applied) {
      // Otra transición concurrente ya movió la OT desde que se leyó
      // `previousStatus` — evita perder un update o dejar `status_history`
      // con una fila que no refleja la secuencia real de `status`.
      throw new ConflictException(
        `La orden de trabajo "${workOrderId}" cambió de estado ` +
          'concurrentemente. Reintente la operación.',
      );
    }
    await this.repository.createHistoryEntry(
      { workOrderId, userId, previousStatus, newStatus, reason },
      tx,
    );
    return { ...workOrder, status: newStatus };
  }

  /** Historial completo de una OT, en orden cronológico — lo usa `dossier`. */
  history(workOrderId: string): Promise<StatusHistory[]> {
    return this.repository.findByWorkOrderId(workOrderId);
  }
}
