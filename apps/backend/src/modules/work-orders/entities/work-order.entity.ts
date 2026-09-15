import { ApiProperty } from '@nestjs/swagger';
import { WorkOrderStatus } from '../../../generated/prisma/client';
import type { WorkOrder } from '../../../generated/prisma/client';

/**
 * Forma de una `WORK_ORDER` en las respuestas de la API. Clase (no el
 * tipo generado por Prisma) para que `@nestjs/swagger` documente el
 * shape. `implements WorkOrder` la mantiene alineada con el schema.
 */
export class WorkOrderEntity implements WorkOrder {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({
    format: 'uuid',
    description: 'Cotización aprobada que originó la OT.',
  })
  quoteId!: string;

  @ApiProperty({
    enum: WorkOrderStatus,
    enumName: 'WorkOrderStatus',
    description:
      'Estado en la máquina de estados de la OT (docs/architecture.md).',
  })
  status!: WorkOrderStatus;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({
    format: 'uuid',
    nullable: true,
    description:
      'OT que esta reemplaza — solo en una OT de refabricación tras ' +
      'agotar los reprocesos (ADR-0006). Nulo en una OT original.',
  })
  replacesWorkOrderId!: string | null;
}
