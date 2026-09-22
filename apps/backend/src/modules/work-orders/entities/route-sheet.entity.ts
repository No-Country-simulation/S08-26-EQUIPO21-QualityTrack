import { ApiProperty } from '@nestjs/swagger';
import type { RouteSheet } from '../../../generated/prisma/client';
import { OperationEntity } from './operation.entity';

/**
 * Forma de un `ROUTE_SHEET` con sus `OPERATION` en las respuestas de la
 * API. `implements RouteSheet` la mantiene alineada con el schema;
 * `operations` es el include que siempre acompaña a la hoja de ruta —
 * sin sus operaciones no sirve de nada (mismo criterio que
 * `RequestWithCustomer`).
 */
export class RouteSheetEntity implements RouteSheet {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  workOrderId!: string;

  @ApiProperty({
    description: 'Reservado para futuras revisiones. Hoy siempre 1.',
  })
  sequence!: number;

  @ApiProperty({
    type: [OperationEntity],
    description: 'Operaciones ordenadas por `sequence` (1..N).',
  })
  operations!: OperationEntity[];
}
