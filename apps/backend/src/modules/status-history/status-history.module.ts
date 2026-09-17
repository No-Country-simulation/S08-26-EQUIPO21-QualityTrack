import { Module } from '@nestjs/common';
import { StatusHistoryService } from './status-history.service';
import { StatusHistoryRepository } from './status-history.repository';

/**
 * Trazabilidad — escritura (ADR-0005): único módulo con acceso a
 * `work_order.status` y `status_history`. Expone `StatusHistoryService`
 * para que `work-orders`, `quality` y cualquier otro módulo que mueva
 * el estado de una OT llame a `transition()` en vez de tocar esas tablas
 * directamente.
 */
@Module({
  providers: [StatusHistoryService, StatusHistoryRepository],
  exports: [StatusHistoryService],
})
export class StatusHistoryModule {}
