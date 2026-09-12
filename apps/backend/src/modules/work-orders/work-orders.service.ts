import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { WorkOrdersRepository } from './work-orders.repository';
import type { Prisma, WorkOrder } from '../../generated/prisma/client';

/**
 * Producción — alta y consulta básica de `WORK_ORDER` (Épica 3).
 *
 * En esta etapa el módulo solo cubre lo que necesita la aprobación de
 * una cotización: crear la OT que nace de ella. La hoja de ruta, las
 * operaciones y las transiciones de estado llegan con sus propias
 * issues (#31, #34); las transiciones se delegarán en
 * `StatusHistoryService.transition()` (ADR-0005), nunca acá.
 */
@Injectable()
export class WorkOrdersService {
  constructor(private readonly workOrders: WorkOrdersRepository) {}

  /**
   * Crea la OT original de una cotización aprobada. La invoca
   * `QuotesService.approve()` dentro de la transacción de aprobación:
   * si esto falla, la aprobación se revierte junto con la creación.
   *
   * - "Una cotización pendiente o rechazada no puede generar una OT":
   *   lo garantiza `QuotesService`, que solo llama acá tras mover la
   *   cotización a `approved` en la misma transacción.
   * - "Una misma cotización no genera OTs duplicadas": pre-check acá +
   *   índice único parcial en la BD (ADR-0001).
   */
  async createFromApprovedQuote(
    quoteId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<WorkOrder> {
    const existing = await this.workOrders.findOriginalByQuoteId(quoteId, tx);
    if (existing !== null) {
      throw new ConflictException(
        `La cotización "${quoteId}" ya tiene una orden de trabajo (${existing.id}).`,
      );
    }
    return this.workOrders.createOriginal({ quoteId }, tx);
  }

  /** Datos básicos de una OT — cualquier rol puede consultarla (Épica 3). */
  async findOne(id: string): Promise<WorkOrder> {
    const workOrder = await this.workOrders.findById(id);
    if (workOrder === null) {
      throw new NotFoundException(
        `No existe una orden de trabajo con id "${id}".`,
      );
    }
    return workOrder;
  }
}
