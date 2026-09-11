import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import {
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { WorkOrdersService } from './work-orders.service';
import { WorkOrderEntity } from './entities/work-order.entity';

@ApiTags('work-orders')
@Controller('work-orders')
export class WorkOrdersController {
  constructor(private readonly workOrders: WorkOrdersService) {}

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
