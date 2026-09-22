import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsNotEmpty,
  IsString,
  IsUUID,
  MaxLength,
  ValidateNested,
} from 'class-validator';

/**
 * Un paso de la hoja de ruta (`OPERATION`). El orden en el array define
 * `sequence` (1..N) — no se pide como campo separado, el orden de carga
 * es el orden de fabricación.
 */
export class CreateOperationDto {
  @ApiProperty({
    description: 'Tipo de operación (torneado, fresado, soldadura, ...).',
    example: 'Torneado CNC',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  type!: string;
}

/**
 * Alta de la hoja de ruta de una OT (Épica 6, issue #31). Solo se
 * permite sobre una OT en `created` — esa validación la hace la máquina
 * de estados de `status-history` al transicionar `created -> routed`,
 * no se duplica acá.
 *
 * `userId` va explícito en el body: todavía no hay auth (`users/auth`
 * pendiente, issue #35). Cuando exista, se reemplaza por el usuario del
 * token.
 */
export class CreateRouteSheetDto {
  @ApiProperty({
    type: [CreateOperationDto],
    description:
      'Operaciones en el orden en que se ejecutan. Al menos una — una ' +
      'hoja de ruta sin operaciones no representa ningún trabajo.',
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateOperationDto)
  operations!: CreateOperationDto[];

  @ApiProperty({
    format: 'uuid',
    description: 'Usuario de Planta que define la hoja de ruta.',
  })
  @IsUUID()
  userId!: string;
}
