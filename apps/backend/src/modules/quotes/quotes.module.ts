import { Module } from '@nestjs/common';
import { CustomersController } from './customers.controller';
import { CustomersService } from './customers.service';
import { CustomersRepository } from './customers.repository';
import { RequestsController } from './requests.controller';
import { RequestsService } from './requests.service';
import { RequestsRepository } from './requests.repository';
import { QuotesController } from './quotes.controller';
import { QuotesService } from './quotes.service';
import { QuotesRepository } from './quotes.repository';
import { WorkOrdersModule } from '../work-orders/work-orders.module';

/**
 * Módulo Comercial (ADR-0005): CUSTOMER, REQUEST y QUOTE. Expone el CRUD
 * de clientes, el de solicitudes, y el ciclo de la cotización
 * (alta / aprobación / rechazo) más el panel de Comercial.
 *
 * Importa `WorkOrdersModule` porque aprobar una cotización genera la OT
 * original (`QuotesService` → `WorkOrdersService.createFromApprovedQuote`).
 */
@Module({
  imports: [WorkOrdersModule],
  controllers: [CustomersController, RequestsController, QuotesController],
  providers: [
    CustomersService,
    CustomersRepository,
    RequestsService,
    RequestsRepository,
    QuotesService,
    QuotesRepository,
  ],
  exports: [CustomersService],
})
export class QuotesModule {}
