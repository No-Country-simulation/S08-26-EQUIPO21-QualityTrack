import { PartialType } from '@nestjs/swagger';
import { CreateCustomerDto } from './create-customer.dto';

/**
 * Actualización parcial de un cliente: todos los campos de
 * `CreateCustomerDto` pasan a ser opcionales, conservando sus reglas de
 * validación cuando vienen presentes.
 */
export class UpdateCustomerDto extends PartialType(CreateCustomerDto) {}
