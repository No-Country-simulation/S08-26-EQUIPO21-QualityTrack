import {
  Body,
  Controller,
  Get,
  Param,
  ParseEnumPipe,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { WorkOrdersService } from './work-orders.service';
import { WorkOrderEntity } from './entities/work-order.entity';
import { WorkOrderWithRelationsEntity } from './entities/work-order-with-relations.entity';
import { RouteSheetEntity } from './entities/route-sheet.entity';
import { CreateRouteSheetDto } from './dto/create-route-sheet.dto';
import { WorkOrderStatus } from '../../generated/prisma/client';

@ApiTags('work-orders')
@Controller('work-orders')
export class WorkOrdersController {
  constructor(private readonly workOrders: WorkOrdersService) {}

  @Get()
  @ApiOperation({
    summary: 'Listado de OT',
    description:
      'Devuelve las OT con su cotización, solicitud y cliente — el ' +
      'tablero de Producción (issue #69) arma sus tabs (Pendientes de ' +
      'ruta / En producción / En calidad) agrupando por `status` en el ' +
      'cliente, mismo patrón que `GET /quotes`. Con `status` filtra por ' +
      'un único estado; sin él devuelve todas.',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: WorkOrderStatus,
    description: 'Filtrar por estado. Sin esto, devuelve todas.',
  })
  @ApiOkResponse({ type: WorkOrderWithRelationsEntity, isArray: true })
  findAll(
    @Query('status', new ParseEnumPipe(WorkOrderStatus, { optional: true }))
    status?: WorkOrderStatus,
  ) {
    return this.workOrders.findAll(status);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Datos básicos de una OT',
    description:
      'Devuelve los datos básicos de la orden de trabajo. Cualquier rol ' +
      'puede consultarla (Épica 3). El expediente completo (historial, ' +
      'documentos, hoja de ruta, calidad) es `GET /work-orders/:id/dossier`.',
  })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ type: WorkOrderEntity })
  @ApiNotFoundResponse({
    description: 'No existe una orden de trabajo con ese id.',
  })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.workOrders.findOne(id);
  }

  @Post(':id/route-sheet')
  @ApiOperation({
    summary: 'Alta de la hoja de ruta',
    description:
      'Define la secuencia de operaciones de la OT y la transiciona ' +
      '`created -> routed` en la misma transacción (Épica 6). 409 si la ' +
      'OT no está en `created` — también cubre el intento de dar de ' +
      'alta una segunda hoja de ruta.',
  })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiCreatedResponse({ type: RouteSheetEntity })
  @ApiNotFoundResponse({
    description: 'No existe una orden de trabajo con ese id.',
  })
  @ApiConflictResponse({
    description:
      'La OT no está en `created` (ya tiene hoja de ruta, o no llegó a producción).',
  })
  createRouteSheet(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateRouteSheetDto,
  ) {
    return this.workOrders.createRouteSheet(
      id,
      dto.operations.map((operation) => operation.type),
      dto.userId,
    );
  }

  @Get(':id/route-sheet')
  @ApiOperation({
    summary: 'Hoja de ruta de una OT',
    description:
      'Devuelve la hoja de ruta con sus operaciones ordenadas (1..N), ' +
      'reflejando el avance real de producción (Épica 6).',
  })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ type: RouteSheetEntity })
  @ApiNotFoundResponse({
    description: 'La OT no existe, o todavía no tiene hoja de ruta.',
  })
  getRouteSheet(@Param('id', ParseUUIDPipe) id: string) {
    return this.workOrders.getRouteSheet(id);
  }
}
