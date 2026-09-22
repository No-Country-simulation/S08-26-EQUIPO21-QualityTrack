import { Module } from '@nestjs/common';
import { WorkOrdersController } from './work-orders.controller';
import { WorkOrdersService } from './work-orders.service';
import { WorkOrdersRepository } from './work-orders.repository';
import { RouteSheetsRepository } from './route-sheets.repository';
import { OperationsController } from './operations.controller';
import { OperationsService } from './operations.service';
import { OperationsRepository } from './operations.repository';
import { StatusHistoryModule } from '../status-history/status-history.module';

/**
 * Producción (ADR-0005): `WORK_ORDER`, `ROUTE_SHEET`, `OPERATION`.
 * Expone el alta de la OT que nace de una cotización aprobada (Épica 3),
 * su consulta básica, y el alta/consulta de la hoja de ruta más el
 * inicio/fin de cada operación (Épica 6, issue #31). Las transiciones de
 * estado se delegan siempre en `StatusHistoryService` — de ahí el
 * `imports: [StatusHistoryModule]`.
 *
 * `exports: [WorkOrdersService]` — `QuotesService` lo inyecta para crear
 * la OT al aprobar una cotización.
 */
@Module({
  imports: [StatusHistoryModule],
  controllers: [WorkOrdersController, OperationsController],
  providers: [
    WorkOrdersService,
    WorkOrdersRepository,
    RouteSheetsRepository,
    OperationsService,
    OperationsRepository,
  ],
  exports: [WorkOrdersService],
})
export class WorkOrdersModule {}
