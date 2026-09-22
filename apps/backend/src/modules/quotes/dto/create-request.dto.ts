import { ApiProperty } from '@nestjs/swagger';
import {
  IsInt,
  IsNotEmpty,
  IsPositive,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

/**
 * Alta de una solicitud (`REQUEST`): el pedido original del cliente,
 * antes de cotizarlo (ver ADR-0003). Se asocia siempre a un `CUSTOMER`
 * existente y no archivado (ADR-0007) — esa validación vive en el
 * service, no acá.
 *
 * `piece` + `quantity` son los datos estructurados del trabajo pedido
 * (antes vivían aplastados en un único `description` de texto libre).
 * Las especificaciones técnicas del trabajo (planos, certificados de
 * materia prima) no van acá: se adjuntan como `DOCUMENT` sobre la OT
 * (Épica 4, ADR-0010). La solicitud no tiene estado propio: se infiere
 * si tiene o no una `QUOTE` asociada (ADR-0003).
 */
export class CreateRequestDto {
  @ApiProperty({
    format: 'uuid',
    description:
      'Id del cliente que hace la solicitud. Debe existir y no estar archivado.',
  })
  @IsUUID()
  customerId!: string;

  @ApiProperty({
    description: 'Nombre o descripción corta de la pieza solicitada.',
    example: 'Brida DN200',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  piece!: string;

  @ApiProperty({
    description: 'Cantidad de piezas solicitadas. Entero positivo.',
    example: 12,
  })
  @IsInt()
  @IsPositive()
  quantity!: number;
}
