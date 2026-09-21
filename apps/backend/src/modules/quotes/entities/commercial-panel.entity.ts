import { ApiProperty } from '@nestjs/swagger';
import { RequestWithCustomerEntity } from './request.entity';
import { QuoteWithRelationsEntity } from './quote.entity';

/**
 * Respuesta de `GET /quotes/commercial-panel`: la cola de trabajo de
 * Comercial en una sola respuesta (Épica 2).
 */
export class CommercialPanelEntity {
  @ApiProperty({
    type: RequestWithCustomerEntity,
    isArray: true,
    description:
      'Solicitudes que todavía no tienen cotización, con su cliente.',
  })
  requestsPendingQuote!: RequestWithCustomerEntity[];

  @ApiProperty({
    type: QuoteWithRelationsEntity,
    isArray: true,
    description:
      'Cotizaciones en `pending_approval`, con su solicitud y cliente.',
  })
  quotesPendingApproval!: QuoteWithRelationsEntity[];
}
