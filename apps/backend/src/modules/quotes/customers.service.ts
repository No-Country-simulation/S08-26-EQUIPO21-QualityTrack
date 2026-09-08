import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CustomersRepository } from './customers.repository';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import type { Customer } from '../../generated/prisma/client';

/**
 * Alta y consulta de clientes (área Comercial). Un cliente tiene que
 * existir antes de poder registrar una `REQUEST` a su nombre
 * (ver ADR-0001 / ADR-0003).
 *
 * `taxId` es el único identificador único a nivel dominio (ADR-0007):
 * el intento de crear o mover un cliente a un `taxId` ya usado se
 * traduce a 409, no se deja propagar el error P2002 de Prisma.
 *
 * Un cliente no se borra: se archiva (ADR-0007). `archive()` /
 * `unarchive()` son idempotentes.
 */
@Injectable()
export class CustomersService {
  constructor(private readonly customers: CustomersRepository) {}

  async create(dto: CreateCustomerDto): Promise<Customer> {
    const existing = await this.customers.findByTaxId(dto.taxId);
    if (existing !== null) {
      throw new ConflictException(
        `Ya existe un cliente con el identificador tributario "${dto.taxId}".`,
      );
    }
    return this.customers.create({
      name: dto.name,
      taxId: dto.taxId,
      email: dto.email,
      phone: dto.phone ?? null,
      address: dto.address ?? null,
    });
  }

  findAll(includeArchived = false): Promise<Customer[]> {
    return this.customers.findMany({ includeArchived });
  }

  /**
   * Devuelve el cliente aunque esté archivado (lo necesita el dossier y
   * las pantallas de detalle). El 404 es solo para un id inexistente.
   */
  async findOne(id: string): Promise<Customer> {
    const customer = await this.customers.findById(id);
    if (customer === null) {
      throw new NotFoundException(`No existe un cliente con id "${id}".`);
    }
    return customer;
  }

  async update(id: string, dto: UpdateCustomerDto): Promise<Customer> {
    await this.findOne(id);

    if (dto.taxId !== undefined) {
      const other = await this.customers.findByTaxId(dto.taxId);
      if (other !== null && other.id !== id) {
        throw new ConflictException(
          `Ya existe un cliente con el identificador tributario "${dto.taxId}".`,
        );
      }
    }

    return this.customers.update(id, {
      name: dto.name,
      taxId: dto.taxId,
      email: dto.email,
      phone: dto.phone,
      address: dto.address,
    });
  }

  /**
   * Archiva un cliente: no aparece más en los listados por defecto y no
   * acepta `REQUEST` nuevas. Su historial queda intacto. Idempotente:
   * archivar un cliente ya archivado no falla ni cambia la fecha
   * original.
   */
  async archive(id: string): Promise<Customer> {
    const customer = await this.findOne(id);
    if (customer.archivedAt !== null) {
      return customer;
    }
    return this.customers.update(id, { archivedAt: new Date() });
  }

  /**
   * Reactiva un cliente archivado. Idempotente sobre un cliente activo.
   */
  async unarchive(id: string): Promise<Customer> {
    const customer = await this.findOne(id);
    if (customer.archivedAt === null) {
      return customer;
    }
    return this.customers.update(id, { archivedAt: null });
  }
}
