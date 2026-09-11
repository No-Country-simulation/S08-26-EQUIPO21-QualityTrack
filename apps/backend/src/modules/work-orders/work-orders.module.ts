import { Module } from '@nestjs/common';
import { WorkOrdersController } from './work-orders.controller';
import { WorkOrdersService } from './work-orders.service';
import { WorkOrdersRepository } from './work-orders.repository';

/**
 * Producción (ADR-0005): WORK_ORDER, ROUTE_SHEET, OPERATION. Hoy expone
 * el alta de la OT que nace de una cotización aprobada (Épica 3) y su
 * consulta básica. La hoja de ruta y las operaciones llegan con la
 * Épica 6; las transiciones de estado se delegarán en
 * `StatusHistoryService` (ADR-0005).
 *
 * `exports: [WorkOrdersService]` — `QuotesService` lo inyecta para crear
 * la OT al aprobar una cotización.
 */
@Module({
  controllers: [WorkOrdersController],
  providers: [WorkOrdersService, WorkOrdersRepository],
  exports: [WorkOrdersService],
})
export class WorkOrdersModule {}
