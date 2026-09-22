import { Body, Controller, Param, ParseUUIDPipe, Patch } from '@nestjs/common';
import {
  ApiConflictResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { OperationsService } from './operations.service';
import { OperationEntity } from './entities/operation.entity';
import { OperationActionDto } from './dto/operation-action.dto';

@ApiTags('operations')
@Controller('operations')
export class OperationsController {
  constructor(private readonly operations: OperationsService) {}

  @Patch(':id/start')
  @ApiOperation({
    summary: 'Iniciar una operación',
    description:
      'Registra qué usuario inicia la operación (`pending -> in_progress`). ' +
      'Si es la primera de la hoja de ruta, transiciona la OT `routed -> ' +
      'in_production` en la misma transacción (Épica 6).',
  })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ type: OperationEntity })
  @ApiNotFoundResponse({ description: 'No existe una operación con ese id.' })
  @ApiConflictResponse({
    description: 'La operación no está pendiente de iniciar.',
  })
  start(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: OperationActionDto,
  ) {
    return this.operations.start(id, dto.userId);
  }

  @Patch(':id/finish')
  @ApiOperation({
    summary: 'Completar una operación',
    description:
      'Registra qué usuario completa la operación (`in_progress -> ' +
      'completed`). Si es la última de la hoja de ruta, transiciona la ' +
      'OT `in_production -> in_quality_control` en la misma transacción ' +
      '— mientras quede alguna sin completar, esto nunca ocurre (Épica 6).',
  })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ type: OperationEntity })
  @ApiNotFoundResponse({ description: 'No existe una operación con ese id.' })
  @ApiConflictResponse({
    description: 'La operación no está en curso.',
  })
  finish(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: OperationActionDto,
  ) {
    return this.operations.finish(id, dto.userId);
  }
}
