import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

/**
 * Alta de un cliente. `name`, `taxId` y `email` son obligatorios;
 * `phone` y `address` son datos de contacto opcionales (ver el modelo
 * Customer en prisma/schema.prisma y el ERD de docs/architecture.md).
 *
 * `taxId` no valida formato por país: es un identificador tributario
 * opaco (CUIT, NIT, NIF, RFC...) y el único identificador único del
 * cliente (ADR-0007). La unicidad se garantiza en la base y se traduce
 * a 409 en el service.
 *
 * `email` es obligatorio pero NO único (ADR-0008): es el canal de
 * contacto que el flujo necesita garantizado.
 */
export class CreateCustomerDto {
  @ApiProperty({ description: 'Razón social o nombre del cliente' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name!: string;

  @ApiProperty({
    description:
      'Identificador tributario del cliente (CUIT, NIT, NIF, RFC...). ' +
      'Único entre todos los clientes.',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  taxId!: string;

  @ApiProperty({ description: 'Correo de contacto (obligatorio, no único)' })
  @IsEmail()
  @MaxLength(320)
  email!: string;

  @ApiPropertyOptional({ description: 'Teléfono de contacto' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(30)
  phone?: string;

  @ApiPropertyOptional({ description: 'Dirección (texto libre, una línea)' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(300)
  address?: string;
}
