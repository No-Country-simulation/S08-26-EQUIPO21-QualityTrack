import { Module } from '@nestjs/common';
import { CustomersController } from './customers.controller';
import { CustomersService } from './customers.service';
import { CustomersRepository } from './customers.repository';
import { RequestsController } from './requests.controller';
import { RequestsService } from './requests.service';
import { RequestsRepository } from './requests.repository';

/**
 * Módulo Comercial (ADR-0005): CUSTOMER, REQUEST y QUOTE. Hoy expone el
 * CRUD de clientes y el de solicitudes; el controller/service de QUOTE
 * se registra acá cuando tenga lógica real — no antes, para no publicar
 * endpoints scaffold.
 */
@Module({
  controllers: [CustomersController, RequestsController],
  providers: [
    CustomersService,
    CustomersRepository,
    RequestsService,
    RequestsRepository,
  ],
  exports: [CustomersService],
})
export class QuotesModule {}
