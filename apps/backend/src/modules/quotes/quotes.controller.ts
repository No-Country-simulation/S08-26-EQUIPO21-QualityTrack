import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { QuotesService } from './quotes.service';
import { CreateQuoteDto } from './dto/create-quote.dto';
import {
  ApprovedQuoteEntity,
  QuoteEntity,
  QuoteWithRelationsEntity,
} from './entities/quote.entity';
import { CommercialPanelEntity } from './entities/commercial-panel.entity';

@ApiTags('quotes')
@Controller('quotes')
export class QuotesController {
  constructor(private readonly quotes: QuotesService) {}

  @Post()
  @ApiOperation({
    summary: 'Alta de una cotización',
    description:
      'Registra el monto cotizado para una solicitud existente. Si la ' +
      'solicitud no existe responde 404; si ya tiene una cotización, 409 ' +
      '(una solicitud, una cotización — ADR-0003). Nace en ' +
      '`pending_approval`.',
  })
  @ApiCreatedResponse({ type: QuoteEntity })
  @ApiBadRequestResponse({
    description:
      'El body no cumple las validaciones (requestId no UUID, amount ≤ 0, etc.).',
  })
  @ApiNotFoundResponse({
    description: 'No existe una solicitud con ese `requestId`.',
  })
  @ApiConflictResponse({ description: 'La solicitud ya tiene una cotización.' })
  create(@Body() dto: CreateQuoteDto) {
    return this.quotes.create(dto);
  }

  @Get('commercial-panel')
  @ApiOperation({
    summary: 'Panel de Comercial',
    description:
      'Devuelve en una sola respuesta lo que espera acción de Comercial: ' +
      '`requestsPendingQuote` (solicitudes sin cotizar) y ' +
      '`quotesPendingApproval` (cotizaciones pendientes de aprobación o ' +
      'rechazo, con solicitud y cliente).',
  })
  @ApiOkResponse({ type: CommercialPanelEntity })
  commercialPanel() {
    return this.quotes.commercialPanel();
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Detalle de una cotización',
    description:
      'Devuelve la cotización con la solicitud y el cliente asociados, en ' +
      'una sola respuesta.',
  })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ type: QuoteWithRelationsEntity })
  @ApiNotFoundResponse({ description: 'No existe una cotización con ese id.' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.quotes.findOne(id);
  }

  @Patch(':id/approve')
  @ApiOperation({
    summary: 'Registrar aprobación de una cotización',
    description:
      'Comercial registra la aprobación del cliente (que ocurre fuera del ' +
      'sistema). Mueve la cotización a `approved` y genera la OT original ' +
      'en la misma transacción (Épica 3). 409 si la cotización no está en ' +
      '`pending_approval`.',
  })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ type: ApprovedQuoteEntity })
  @ApiNotFoundResponse({ description: 'No existe una cotización con ese id.' })
  @ApiConflictResponse({
    description: 'La cotización ya fue aprobada o rechazada.',
  })
  approve(@Param('id', ParseUUIDPipe) id: string) {
    return this.quotes.approve(id);
  }

  @Patch(':id/reject')
  @ApiOperation({
    summary: 'Registrar rechazo de una cotización',
    description:
      'Comercial registra el rechazo del cliente. La cotización pasa a ' +
      '`rejected` (terminal) y no genera OT. 409 si no está en ' +
      '`pending_approval`.',
  })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ type: QuoteEntity })
  @ApiNotFoundResponse({ description: 'No existe una cotización con ese id.' })
  @ApiConflictResponse({
    description: 'La cotización ya fue aprobada o rechazada.',
  })
  reject(@Param('id', ParseUUIDPipe) id: string) {
    return this.quotes.reject(id);
  }
}
