import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsUUID, MaxLength } from 'class-validator';

/**
 * Alta de una solicitud (`REQUEST`): el pedido original del cliente,
 * antes de cotizarlo (ver ADR-0003). Se asocia siempre a un `CUSTOMER`
 * existente y no archivado (ADR-0007) — esa validación vive en el
 * service, no acá.
 *
 * `description` es el texto libre del trabajo pedido. La solicitud no
 * tiene estado propio: se infiere si tiene o no una `QUOTE` asociada
 * (ADR-0003).
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
    description:
      'Descripción del trabajo solicitado por el cliente (texto libre).',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  description!: string;
}
