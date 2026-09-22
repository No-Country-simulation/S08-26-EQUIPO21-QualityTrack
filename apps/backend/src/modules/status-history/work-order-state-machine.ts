import { WorkOrderStatus } from '../../generated/prisma/client';
import { WorkOrderEvent } from './work-order-event';

/**
 * Máquina de estados de `WORK_ORDER` (tabla de transiciones válidas de
 * `docs/architecture.md`). Puro y sin acceso a datos: no sabe nada de
 * `STATUS_HISTORY` ni de la BD — solo qué transición es legal desde qué
 * estado. `StatusHistoryService` es quien la usa junto con el conteo de
 * reprocesos para decidir la transición real (ADR-0005, punto 4).
 */
const TRANSITIONS: Record<
  WorkOrderStatus,
  Partial<Record<WorkOrderEvent, WorkOrderStatus>>
> = {
  [WorkOrderStatus.created]: {
    [WorkOrderEvent.Route]: WorkOrderStatus.routed,
    [WorkOrderEvent.Cancel]: WorkOrderStatus.cancelled,
  },
  [WorkOrderStatus.routed]: {
    [WorkOrderEvent.StartProduction]: WorkOrderStatus.in_production,
    [WorkOrderEvent.Cancel]: WorkOrderStatus.cancelled,
  },
  [WorkOrderStatus.in_production]: {
    [WorkOrderEvent.SendToQualityControl]: WorkOrderStatus.in_quality_control,
    [WorkOrderEvent.Cancel]: WorkOrderStatus.cancelled,
  },
  [WorkOrderStatus.in_quality_control]: {
    [WorkOrderEvent.Deliver]: WorkOrderStatus.delivered,
    [WorkOrderEvent.MarkNonconforming]: WorkOrderStatus.nonconforming,
    [WorkOrderEvent.Cancel]: WorkOrderStatus.cancelled,
  },
  [WorkOrderStatus.nonconforming]: {
    [WorkOrderEvent.Reprocess]: WorkOrderStatus.in_production,
    [WorkOrderEvent.Cancel]: WorkOrderStatus.cancelled,
  },
  // Terminales: sin transiciones de salida. `delivered` no admite Cancel
  // (ADR-0006 — "nunca se cancela desde delivered").
  [WorkOrderStatus.delivered]: {},
  [WorkOrderStatus.cancelled]: {},
};

/**
 * Estado siguiente para `event` desde `current`, o `undefined` si la
 * transición no es legal.
 */
export function getNextStatus(
  current: WorkOrderStatus,
  event: WorkOrderEvent,
): WorkOrderStatus | undefined {
  return TRANSITIONS[current][event];
}

/**
 * Límite de reprocesos por OT (ADR-0002): una pieza puede volver a
 * producción hasta 3 veces. `nonconformingCount` es el total de filas
 * `STATUS_HISTORY` con `new_status = nonconforming` para la OT,
 * incluida la que acaba de disparar este intento de reproceso.
 */
const REPROCESS_LIMIT = 3;

/** Motivo fijo con el que `status-history` cancela automáticamente al agotar el límite (ADR-0006). */
export const REPROCESS_LIMIT_REASON = 'reprocess_limit_reached';

export function hasReachedReprocessLimit(nonconformingCount: number): boolean {
  return nonconformingCount > REPROCESS_LIMIT;
}
