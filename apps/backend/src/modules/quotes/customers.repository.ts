import { ConflictException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '../../generated/prisma/client';
import type { Customer } from '../../generated/prisma/client';

/**
 * Acceso a datos de `CUSTOMER`. Envuelve las llamadas de Prisma para que
 * el service trabaje contra una interfaz acotada y no contra el cliente
 * completo (ver docs/backend-structure.md).
 *
 * Regla de ADR-0007: un cliente no se borra, se archiva. Los métodos de
 * listado ocultan los clientes archivados salvo que se pida lo
 * contrario; `findById` / `findByTaxId` NO filtran -- el dossier y la
 * validación de `taxId` único necesitan ver a los archivados.
 *
 * `create` / `update` traducen la violación del `@@unique([taxId])`
 * (P2002 de Prisma) a un 409: el service hace un pre-check por `taxId`
 * para el mensaje temprano, pero entre ese SELECT y el INSERT hay una
 * ventana de carrera -- el constraint es la garantía real, y acá se
 * captura para no propagar un 500 (ver ADR-0007 / ADR-0008).
 */
@Injectable()
export class CustomersRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.CustomerCreateInput): Promise<Customer> {
    try {
      return await this.prisma.customer.create({ data });
    } catch (error) {
      throw this.translateTaxIdConflict(error, data.taxId);
    }
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

  async update(
    id: string,
    data: Prisma.CustomerUpdateInput,
  ): Promise<Customer> {
    try {
      return await this.prisma.customer.update({ where: { id }, data });
    } catch (error) {
      throw this.translateTaxIdConflict(error, data.taxId);
    }
  }

  /**
   * Si `error` es la violación del unique de `tax_id`, devuelve un
   * `ConflictException` con mensaje de dominio. Cualquier otro error se
   * devuelve tal cual para que se propague sin cambios.
   *
   * `meta.target` en un P2002 puede llegar como lista de campos
   * (`["tax_id"]`) o como el nombre del índice (`customer_tax_id_key`),
   * según venga del engine o del driver adapter -- se contemplan ambos.
   */
  private translateTaxIdConflict(
    error: unknown,
    taxId: Prisma.CustomerUpdateInput['taxId'],
  ): unknown {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002' &&
      this.targetMentionsTaxId(error.meta?.target)
    ) {
      const value = typeof taxId === 'string' ? taxId : String(taxId);
      return new ConflictException(
        `Ya existe un cliente con el identificador tributario "${value}".`,
      );
    }
    return error;
  }

  private targetMentionsTaxId(target: unknown): boolean {
    let parts: string[];

    if (Array.isArray(target)) {
      parts = target.map(String);
    } else if (typeof target === 'string') {
      parts = [target];
    } else {
      parts = [];
    }

    return parts.some((part) => part.includes('tax_id'));
  }
}
