/**
 * Eventos que disparan una transición de `WORK_ORDER.status`. Cada
 * evento nombra la transición canónica definida en `docs/architecture.md`
 * (tabla de transiciones válidas) — no el estado destino, porque
 * `Reprocess` y `StartProduction` llegan los dos a `in_production` desde
 * estados distintos y con reglas distintas (ADR-0002).
 */
export enum WorkOrderEvent {
  /** `created -> routed`. */
  Route = 'route',
  /** `routed -> in_production`. */
  StartProduction = 'start_production',
  /** `in_production -> in_quality_control`. */
  SendToQualityControl = 'send_to_quality_control',
  /** `in_quality_control -> delivered`. */
  Deliver = 'deliver',
  /** `in_quality_control -> nonconforming`. */
  MarkNonconforming = 'mark_nonconforming',
  /**
   * `nonconforming -> in_production`, hasta 3 veces por OT (ADR-0002).
   * Al agotarse el límite, `StatusHistoryService.transition()` fuerza
   * `nonconforming -> cancelled` en su lugar (ADR-0006).
   */
  Reprocess = 'reprocess',
  /**
   * A `cancelled` desde cualquier estado no terminal. Exige `reason`
   * (ADR-0006).
   */
  Cancel = 'cancel',
}
