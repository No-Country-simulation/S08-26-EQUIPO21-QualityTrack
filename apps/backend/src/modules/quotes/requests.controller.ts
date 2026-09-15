import {
  Body,
  Controller,
  Get,
  Param,
  ParseBoolPipe,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { RequestsService } from './requests.service';
import { CreateRequestDto } from './dto/create-request.dto';
import {
  RequestEntity,
  RequestWithCustomerEntity,
} from './entities/request.entity';

@ApiTags('requests')
@Controller('requests')
export class RequestsController {
  constructor(private readonly requests: RequestsService) {}

  @Post()
  @ApiOperation({
    summary: 'Alta de una solicitud',
    description:
      'Registra el pedido original de un cliente (ADR-0003). Requiere un ' +
      '`customerId` de un cliente existente y no archivado — si el cliente ' +
      'no existe responde 404; si está archivado, 409 (ADR-0007).',
  })
  @ApiCreatedResponse({ type: RequestEntity })
  @ApiBadRequestResponse({
    description:
      'El body no cumple las validaciones (customerId no es UUID, description vacía, etc.).',
  })
  @ApiNotFoundResponse({
    description: 'No existe un cliente con ese `customerId`.',
  })
  @ApiConflictResponse({
    description: 'El cliente está archivado y no acepta solicitudes nuevas.',
  })
  create(@Body() dto: CreateRequestDto) {
    return this.requests.create(dto);
  }

  @Get()
  @ApiOperation({
    summary: 'Listado de solicitudes',
    description:
      'Devuelve las solicitudes, más nuevas primero. Con ' +
      '`pendingQuote=true` filtra a las que todavía no tienen cotización ' +
      '— la cola de trabajo de Comercial (ADR-0003).',
  })
  @ApiQuery({
    name: 'pendingQuote',
    required: false,
    type: Boolean,
    description: 'Devolver solo las solicitudes sin cotización asociada.',
  })
  @ApiOkResponse({ type: RequestEntity, isArray: true })
  findAll(
    @Query('pendingQuote', new ParseBoolPipe({ optional: true }))
    pendingQuote?: boolean,
  ) {
    return this.requests.findAll(pendingQuote ?? false);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Detalle de una solicitud',
    description:
      'Devuelve la solicitud junto con los datos del cliente asociado ' +
      '(AC3), en una sola respuesta. El cliente se incluye aunque esté ' +
      'archivado.',
  })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ type: RequestWithCustomerEntity })
  @ApiNotFoundResponse({ description: 'No existe una solicitud con ese id.' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.requests.findOne(id);
  }
}
