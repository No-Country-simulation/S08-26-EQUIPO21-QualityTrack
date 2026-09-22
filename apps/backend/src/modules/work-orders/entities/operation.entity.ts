import { ApiProperty } from '@nestjs/swagger';
import type { Operation } from '../../../generated/prisma/client';

/**
 * Forma de una `OPERATION` en las respuestas de la API. `implements
 * Operation` la mantiene alineada con el schema (mismo patrón que
 * `WorkOrderEntity`).
 */
export class OperationEntity implements Operation {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  routeSheetId!: string;

  @ApiProperty({ description: 'Orden 1..N dentro de la hoja de ruta.' })
  sequence!: number;

  @ApiProperty({ example: 'Torneado CNC' })
  type!: string;

  @ApiProperty({
    enum: ['pending', 'in_progress', 'completed'],
    description:
      'Sin enum en el schema todavía (no hay ADR que cierre el catálogo).',
  })
  status!: string;

  @ApiProperty({ format: 'uuid', nullable: true })
  startedByUserId!: string | null;

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  startedAt!: Date | null;

  @ApiProperty({ format: 'uuid', nullable: true })
  finishedByUserId!: string | null;

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  finishedAt!: Date | null;

  @ApiProperty({ type: String, format: 'date-time' })
  updatedAt!: Date;
}
