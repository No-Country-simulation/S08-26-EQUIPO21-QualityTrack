import { ApiProperty } from '@nestjs/swagger';
import { QuoteWithRelationsEntity } from '../../quotes/entities/quote.entity';
import { WorkOrderEntity } from './work-order.entity';

/**
 * Una `WORK_ORDER` con la cadena cotización → solicitud → cliente —
 * `GET /work-orders` (issue #69: es de ahí que sale "Cliente", "Pieza" y
 * "Compromiso" en el tablero de Producción).
 */
export class WorkOrderWithRelationsEntity extends WorkOrderEntity {
  @ApiProperty({
    type: QuoteWithRelationsEntity,
    description:
      'Cotización de origen, con la solicitud (pieza, cantidad, fecha de ' +
      'compromiso) y el cliente asociados.',
  })
  quote!: QuoteWithRelationsEntity;
}
