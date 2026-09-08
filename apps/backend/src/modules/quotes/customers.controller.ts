import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseBoolPipe,
  ParseUUIDPipe,
  Patch,
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
import { CustomersService } from './customers.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { CustomerEntity } from './entities/customer.entity';

@ApiTags('customers')
@Controller('customers')
export class CustomersController {
  constructor(private readonly customers: CustomersService) {}

  @Post()
  @ApiOperation({
    summary: 'Alta de un cliente',
    description:
      'Crea un cliente. `name`, `taxId` y `email` son obligatorios; ' +
      '`phone` y `address` opcionales. El `taxId` es único entre todos ' +
      'los clientes.',
  })
  @ApiCreatedResponse({ type: CustomerEntity })
  @ApiBadRequestResponse({
    description:
      'El body no cumple las validaciones (email inválido, campo faltante, etc.).',
  })
  @ApiConflictResponse({ description: 'Ya existe un cliente con ese `taxId`.' })
  create(@Body() dto: CreateCustomerDto) {
    return this.customers.create(dto);
  }

  @Get()
  @ApiOperation({
    summary: 'Listado de clientes',
    description:
      'Devuelve los clientes activos ordenados por nombre. Los clientes ' +
      'archivados (ADR-0007) quedan fuera salvo que se pida ' +
      '`includeArchived=true`.',
  })
  @ApiQuery({
    name: 'includeArchived',
    required: false,
    type: Boolean,
    description: 'Incluir los clientes archivados en el listado.',
  })
  @ApiOkResponse({ type: CustomerEntity, isArray: true })
  findAll(
    @Query('includeArchived', new ParseBoolPipe({ optional: true }))
    includeArchived?: boolean,
  ) {
    return this.customers.findAll(includeArchived ?? false);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Detalle de un cliente',
    description:
      'Devuelve el cliente por id. Un cliente archivado se devuelve igual ' +
      '(con `archivedAt` poblado): el expediente y las pantallas de ' +
      'detalle lo necesitan.',
  })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ type: CustomerEntity })
  @ApiNotFoundResponse({ description: 'No existe un cliente con ese id.' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.customers.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Actualización parcial de un cliente',
    description:
      'Actualiza los campos presentes en el body. Enviar el mismo `taxId` ' +
      'del propio cliente está permitido.',
  })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ type: CustomerEntity })
  @ApiBadRequestResponse({ description: 'El body no cumple las validaciones.' })
  @ApiNotFoundResponse({ description: 'No existe un cliente con ese id.' })
  @ApiConflictResponse({
    description: 'El `taxId` enviado ya pertenece a otro cliente.',
  })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCustomerDto,
  ) {
    return this.customers.update(id, dto);
  }

  // Un cliente no se borra, se archiva (ADR-0007). No hay DELETE.
  @Post(':id/archive')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Archivar un cliente',
    description:
      'Marca el cliente como archivado: deja de aparecer en los listados ' +
      'por defecto y no acepta solicitudes nuevas. Su historial y ' +
      'expedientes quedan intactos. Idempotente: archivar un cliente ya ' +
      'archivado no falla ni cambia la fecha original.',
  })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ type: CustomerEntity })
  @ApiNotFoundResponse({ description: 'No existe un cliente con ese id.' })
  archive(@Param('id', ParseUUIDPipe) id: string) {
    return this.customers.archive(id);
  }

  @Post(':id/unarchive')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Reactivar un cliente archivado',
    description:
      'Limpia el estado de archivado. Idempotente sobre un cliente ya ' +
      'activo.',
  })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ type: CustomerEntity })
  @ApiNotFoundResponse({ description: 'No existe un cliente con ese id.' })
  unarchive(@Param('id', ParseUUIDPipe) id: string) {
    return this.customers.unarchive(id);
  }
}
