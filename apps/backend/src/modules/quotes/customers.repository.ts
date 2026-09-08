import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { Customer, Prisma } from '../../generated/prisma/client';

/**
 * Acceso a datos de `CUSTOMER`. Envuelve las llamadas de Prisma para que
 * el service trabaje contra una interfaz acotada y no contra el cliente
 * completo (ver docs/backend-structure.md).
 *
 * Regla de ADR-0007: un cliente no se borra, se archiva. Los métodos de
 * listado ocultan los clientes archivados salvo que se pida lo
 * contrario; `findById` / `findByTaxId` NO filtran -- el dossier y la
 * validación de `taxId` único necesitan ver a los archivados.
 */
@Injectable()
export class CustomersRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: Prisma.CustomerCreateInput): Promise<Customer> {
    return this.prisma.customer.create({ data });
  }

  findMany(options: { includeArchived?: boolean } = {}): Promise<Customer[]> {
    return this.prisma.customer.findMany({
      where: options.includeArchived ? undefined : { archivedAt: null },
      orderBy: { name: 'asc' },
    });
  }

  findById(id: string): Promise<Customer | null> {
    return this.prisma.customer.findUnique({ where: { id } });
  }

  findByTaxId(taxId: string): Promise<Customer | null> {
    return this.prisma.customer.findUnique({ where: { taxId } });
  }

  update(id: string, data: Prisma.CustomerUpdateInput): Promise<Customer> {
    return this.prisma.customer.update({ where: { id }, data });
  }
}
