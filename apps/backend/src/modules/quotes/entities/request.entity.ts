import { ApiProperty } from '@nestjs/swagger';
import type { Request } from '../../../generated/prisma/client';
import { CustomerEntity } from './customer.entity';

/**
 * Forma de un `REQUEST` en las respuestas de la API. Clase (no el tipo
 * generado por Prisma) para que `@nestjs/swagger` documente el shape.
 * `implements Request` la mantiene alineada con el schema.
 */
export class RequestEntity implements Request {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({
    format: 'uuid',
    description: 'Cliente que hizo la solicitud.',
  })
  customerId!: string;

  @ApiProperty({ description: 'Descripción del trabajo solicitado.' })
  description!: string;

  @ApiProperty({ format: 'date-time' })
  createdAt!: Date;
}

/**
 * Detalle de una solicitud junto con el cliente asociado (AC3 de la
 * Épica 1): `GET /requests/:id` devuelve ambos en una sola respuesta,
 * sin obligar al front a una segunda llamada.
 */
export class RequestWithCustomerEntity extends RequestEntity {
  @ApiProperty({
    type: CustomerEntity,
    description: 'Cliente asociado a la solicitud.',
  })
  customer!: CustomerEntity;
}
