import { ApiProperty } from '@nestjs/swagger';
import { Prisma, QuoteStatus } from '../../../generated/prisma/client';
import type { Quote } from '../../../generated/prisma/client';
import { RequestWithCustomerEntity } from './request.entity';
import { WorkOrderEntity } from '../../work-orders/entities/work-order.entity';

/**
 * Forma de una `QUOTE` en las respuestas de la API. Clase (no el tipo
 * generado por Prisma) para que `@nestjs/swagger` documente el shape.
 * `implements Quote` la mantiene alineada con el schema.
 */
export class QuoteEntity implements Quote {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({
    format: 'uuid',
    description: 'Solicitud que originó la cotización (ADR-0003).',
  })
  requestId!: string;

  @ApiProperty({
    enum: QuoteStatus,
    enumName: 'QuoteStatus',
    description:
      'Estado de la cotización. Nace en `pending_approval`; ' +
      '`approve`/`reject` la mueven a `approved` / `rejected` (terminal).',
  })
  status!: QuoteStatus;

  @ApiProperty({
    type: String,
    example: '15000.50',
    description:
      'Monto cotizado (Decimal(12,2)). Serializa como string para no ' +
      'perder precisión.',
  })
  amount!: Prisma.Decimal;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({
    type: String,
    format: 'date-time',
    description:
      'Fecha del último cambio de estado. La cotización no lleva tabla ' +
      'de historial propia — la entidad trazable es la OT (ADR-0005).',
  })
  updatedAt!: Date;
}

/**
 * Detalle de una cotización con la solicitud y el cliente asociados:
 * `GET /quotes/:id` los devuelve en una sola respuesta (Épica 2 — "la
 * cotización queda vinculada al cliente y a la solicitud").
 */
export class QuoteWithRelationsEntity extends QuoteEntity {
  @ApiProperty({
    type: RequestWithCustomerEntity,
    description: 'Solicitud de origen, con su cliente.',
  })
  request!: RequestWithCustomerEntity;
}

/**
 * Respuesta de `PATCH /quotes/:id/approve`: la cotización aprobada más
 * la OT que se generó a partir de ella (Épica 3).
 */
export class ApprovedQuoteEntity extends QuoteEntity {
  @ApiProperty({
    type: WorkOrderEntity,
    description: 'OT creada a partir de la cotización aprobada.',
  })
  workOrder!: WorkOrderEntity;
}
