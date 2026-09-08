import { ApiProperty } from '@nestjs/swagger';
import type { Customer } from '../../../generated/prisma/client';

/**
 * Forma de un `CUSTOMER` en las respuestas de la API. Es una clase (no el
 * tipo generado por Prisma) para que `@nestjs/swagger` pueda introspeccionarla
 * y documentar el shape en OpenAPI. `implements Customer` la mantiene alineada
 * con el modelo: si el schema cambia, esto no compila.
 */
export class CustomerEntity implements Customer {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ description: 'Razón social o nombre del cliente' })
  name!: string;

  @ApiProperty({
    description:
      'Identificador tributario (CUIT, NIT, NIF, RFC...). Único entre ' +
      'todos los clientes (ADR-0007).',
  })
  taxId!: string;

  @ApiProperty({
    description: 'Correo de contacto. Obligatorio, no único (ADR-0008).',
  })
  email!: string;

  @ApiProperty({
    nullable: true,
    type: String,
    description: 'Teléfono de contacto',
  })
  phone!: string | null;

  @ApiProperty({
    nullable: true,
    type: String,
    description: 'Dirección (texto libre, una línea)',
  })
  address!: string | null;

  @ApiProperty({
    nullable: true,
    type: String,
    format: 'date-time',
    description:
      'Fecha de archivado. `null` => cliente activo; con fecha => ' +
      'archivado (ADR-0007). Un cliente no se borra, se archiva.',
  })
  archivedAt!: Date | null;
}
