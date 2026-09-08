import { Module } from '@nestjs/common';
import { QuotesService } from './quotes.service';
import { QuotesController } from './quotes.controller';
import { CustomersController } from './customers.controller';
import { CustomersService } from './customers.service';
import { CustomersRepository } from './customers.repository';

/**
 * Módulo Comercial (ADR-0005): CUSTOMER, REQUEST y QUOTE. Por ahora
 * expone el CRUD de clientes; solicitudes y cotizaciones se suman acá.
 */
@Module({
  controllers: [CustomersController, QuotesController],
  providers: [CustomersService, CustomersRepository, QuotesService],
  exports: [CustomersService],
})
export class QuotesModule {}
