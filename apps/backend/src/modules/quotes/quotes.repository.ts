import { ConflictException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma, QuoteStatus } from '../../generated/prisma/client';
import type { Quote } from '../../generated/prisma/client';

/** Cotización con la solicitud y el cliente asociados. */
export type QuoteWithRelations = Prisma.QuoteGetPayload<{
  include: { request: { include: { customer: true } } };
}>;

/**
 * Acceso a datos de `QUOTE`. Envuelve las llamadas de Prisma para que el
 * service trabaje contra una interfaz acotada (ver
 * docs/backend-structure.md).
 *
 * `updateStatus` acepta un `Prisma.TransactionClient` opcional: aprobar
 * una cotización mueve `quote.status` y crea la `WORK_ORDER` en la misma
 * transacción (ver `QuotesService.approve`).
 *
 * `QUOTE.requestId` es `@unique` (una solicitud, una cotización): el
 * `create` traduce la violación de ese constraint (P2002) a un 409 para
 * cubrir la carrera entre el pre-check del service y el INSERT.
 */
@Injectable()
export class QuotesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: { requestId: string; amount: number }): Promise<Quote> {
    try {
      return await this.prisma.quote.create({
        data: {
          status: QuoteStatus.pending_approval,
          amount: new Prisma.Decimal(data.amount),
          request: { connect: { id: data.requestId } },
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          `La solicitud "${data.requestId}" ya tiene una cotización.`,
        );
      }
      throw error;
    }
  }

  findById(id: string, tx?: Prisma.TransactionClient): Promise<Quote | null> {
    return (tx ?? this.prisma).quote.findUnique({ where: { id } });
  }

  findByRequestId(requestId: string): Promise<Quote | null> {
    return this.prisma.quote.findUnique({ where: { requestId } });
  }

  findByIdWithRelations(id: string): Promise<QuoteWithRelations | null> {
    return this.prisma.quote.findUnique({
      where: { id },
      include: { request: { include: { customer: true } } },
    });
  }

  /**
   * Cotizaciones en un estado dado, con solicitud y cliente. Ordenadas
   * de más viejas a más nuevas — la cola de pendientes de Comercial
   * atiende primero lo que espera hace más.
   */
  findManyByStatus(status: QuoteStatus): Promise<QuoteWithRelations[]> {
    return this.prisma.quote.findMany({
      where: { status },
      include: { request: { include: { customer: true } } },
      orderBy: { createdAt: 'asc' },
    });
  }

  updateStatus(
    id: string,
    status: QuoteStatus,
    tx?: Prisma.TransactionClient,
  ): Promise<Quote> {
    return (tx ?? this.prisma).quote.update({
      where: { id },
      data: { status },
    });
  }
}
