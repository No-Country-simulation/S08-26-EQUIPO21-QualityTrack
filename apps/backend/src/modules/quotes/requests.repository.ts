import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { Prisma, Request } from '../../generated/prisma/client';

/**
 * Acceso a datos de `REQUEST`. Envuelve las llamadas de Prisma para que
 * el service trabaje contra una interfaz acotada (ver
 * docs/backend-structure.md).
 *
 * `REQUEST.customerId` es NOT NULL con `onDelete: Restrict` (ADR-0003):
 * una solicitud no existe sin cliente. La validación de que el cliente
 * exista y no esté archivado la hace el service antes de llamar acá;
 * el `create` se apoya en la FK como última red.
 */
@Injectable()
export class RequestsRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: { customerId: string; description: string }): Promise<Request> {
    return this.prisma.request.create({
      data: {
        description: data.description,
        customer: { connect: { id: data.customerId } },
      },
    });
  }

  /**
   * Listado de solicitudes, más nuevas primero. Con `pendingQuote: true`
   * devuelve solo las que todavía no tienen `QUOTE` asociada — la cola
   * de "sin cotizar" para Comercial (ADR-0003).
   */
  findMany(options: { pendingQuote?: boolean } = {}): Promise<Request[]> {
    return this.prisma.request.findMany({
      where: options.pendingQuote ? { quote: { is: null } } : undefined,
      orderBy: { createdAt: 'desc' },
    });
  }

  /** Solicitud por id, sin relaciones. `null` si no existe. */
  findById(id: string): Promise<Request | null> {
    return this.prisma.request.findUnique({ where: { id } });
  }

  /**
   * Detalle de una solicitud con el cliente asociado (AC3). El cliente
   * viene aunque esté archivado: el detalle de una solicitud vieja tiene
   * que mostrar quién la pidió.
   */
  findByIdWithCustomer(
    id: string,
  ): Promise<Prisma.RequestGetPayload<{ include: { customer: true } }> | null> {
    return this.prisma.request.findUnique({
      where: { id },
      include: { customer: true },
    });
  }
}
