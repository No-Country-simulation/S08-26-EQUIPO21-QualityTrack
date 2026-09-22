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
}
