import { ApiProperty } from '@nestjs/swagger';
import { RequestEntity } from './request.entity';
import { QuoteWithRelationsEntity } from './quote.entity';

/**
 * Respuesta de `GET /quotes/commercial-panel`: la cola de trabajo de
 * Comercial en una sola respuesta (Épica 2).
 */
export class CommercialPanelEntity {
  @ApiProperty({
    type: RequestEntity,
    isArray: true,
    description: 'Solicitudes que todavía no tienen cotización.',
  })
  requestsPendingQuote!: RequestEntity[];

  @ApiProperty({
    type: QuoteWithRelationsEntity,
    isArray: true,
    description:
      'Cotizaciones en `pending_approval`, con su solicitud y cliente.',
  })
  quotesPendingApproval!: QuoteWithRelationsEntity[];
}
