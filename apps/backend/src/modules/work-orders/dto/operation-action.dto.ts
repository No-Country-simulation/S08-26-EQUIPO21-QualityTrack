import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

/**
 * Body de `PATCH /operations/:id/start` y `.../finish`: quién ejecuta
 * la operación (Épica 6, issue #31). Sin auth todavía (issue #35), va
 * explícito — mismo criterio que `CreateRouteSheetDto.userId`.
 */
export class OperationActionDto {
  @ApiProperty({
    format: 'uuid',
    description: 'Usuario de Planta que inicia o completa la operación.',
  })
  @IsUUID()
  userId!: string;
}
