import { ConflictException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma, WorkOrderStatus } from '../../generated/prisma/client';
import type { WorkOrder } from '../../generated/prisma/client';

/**
 * Acceso a datos de `WORK_ORDER`. Envuelve las llamadas de Prisma para
 * que el service trabaje contra una interfaz acotada (ver
 * docs/backend-structure.md).
 *
 * Los métodos de escritura de estado (`status`) y el historial viven en
 * el módulo `status-history` (ADR-0005); acá solo se da de alta la OT
 * "original" que nace de una cotización aprobada.
 *
 * Los métodos aceptan un `Prisma.TransactionClient` opcional: la
 * aprobación de una cotización crea la OT dentro de la misma transacción
 * que mueve `quote.status` (ver `QuotesService.approve`).
 */
@Injectable()
export class WorkOrdersRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Crea la OT original de una cotización, en estado `created`. No
   * escribe `STATUS_HISTORY`: `created` es el génesis de la OT, no una
   * transición (`status_history.previous_status` es NOT NULL).
   *
   * Traduce la violación del índice único parcial
   * `work_order_quote_id_original_key` (una sola OT original por
   * cotización, ADR-0001) de P2002 a un 409 — es la garantía real ante
   * dos aprobaciones concurrentes; el pre-check del service solo da el
   * mensaje temprano.
   */
  async createOriginal(
    data: { quoteId: string },
    tx?: Prisma.TransactionClient,
  ): Promise<WorkOrder> {
    try {
      return await (tx ?? this.prisma).workOrder.create({
        data: {
          status: WorkOrderStatus.created,
          quote: { connect: { id: data.quoteId } },
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          `La cotización "${data.quoteId}" ya tiene una orden de trabajo.`,
        );
      }
      throw error;
    }
  }

  findById(id: string): Promise<WorkOrder | null> {
    return this.prisma.workOrder.findUnique({ where: { id } });
  }

  /**
   * La OT "original" de una cotización: la que no reemplaza a ninguna
   * otra (`replacesWorkOrderId` nulo). Una OT de refabricación (ADR-0006)
   * comparte `quoteId` pero no es la original.
   */
  findOriginalByQuoteId(
    quoteId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<WorkOrder | null> {
    return (tx ?? this.prisma).workOrder.findFirst({
      where: { quoteId, replacesWorkOrderId: null },
    });
  }
}
