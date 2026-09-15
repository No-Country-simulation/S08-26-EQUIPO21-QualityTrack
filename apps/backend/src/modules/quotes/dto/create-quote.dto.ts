import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsPositive, IsUUID, Max } from 'class-validator';

/**
 * Alta de una cotización (`QUOTE`): el precio que Comercial le pasa al
 * cliente por una solicitud (Épica 2). Se asocia siempre a una `REQUEST`
 * existente que todavía no tenga cotización — esa validación vive en el
 * service, no acá.
 *
 * `status` no va en el DTO: toda cotización nace en `pending_approval`.
 * El cliente se alcanza vía la solicitud (ADR-0003), no se repite acá.
 */
export class CreateQuoteDto {
  @ApiProperty({
    format: 'uuid',
    description:
      'Solicitud que se cotiza. Debe existir y no tener otra cotización.',
  })
  @IsUUID()
  requestId!: string;

  @ApiProperty({
    description:
      'Monto cotizado, en la moneda del negocio. Mayor a 0, hasta 2 ' +
      'decimales (columna Decimal(12,2)).',
    example: 15000.5,
    minimum: 0,
    maximum: 9_999_999_999.99,
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  @Max(9_999_999_999.99)
  amount!: number;
}
