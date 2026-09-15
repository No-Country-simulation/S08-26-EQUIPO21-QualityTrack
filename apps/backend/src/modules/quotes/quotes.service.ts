import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { QuotesRepository } from './quotes.repository';
import type { QuoteWithRelations } from './quotes.repository';
import { RequestsRepository } from './requests.repository';
import { WorkOrdersService } from '../work-orders/work-orders.service';
import { CreateQuoteDto } from './dto/create-quote.dto';
import { QuoteStatus } from '../../generated/prisma/client';
import type { Prisma, Quote, Request } from '../../generated/prisma/client';

export interface CommercialPanel {
  /** Solicitudes que todavía no tienen cotización — pendientes de cotizar. */
  requestsPendingQuote: Request[];
  /** Cotizaciones esperando que Comercial registre aprobación o rechazo. */
  quotesPendingApproval: QuoteWithRelations[];
}

export type ApprovedQuote = Quote & {
  workOrder: Awaited<ReturnType<WorkOrdersService['createFromApprovedQuote']>>;
};

/**
 * Cotizaciones (`QUOTE`), área Comercial (Épica 2).
 *
 * Ciclo de la cotización: nace en `pending_approval`; Comercial registra
 * la decisión del cliente (que ocurre fuera del sistema) con `approve`
 * o `reject`. Ambos son terminales — una cotización aprobada o rechazada
 * no vuelve a `pending_approval`.
 *
 * La cotización NO es entidad trazable: su cambio de estado queda en
 * `quote.status` + `quote.updatedAt`, sin `STATUS_HISTORY` (ADR-0005 —
 * esa tabla es exclusiva de la OT). La trazabilidad arranca cuando la
 * aprobación genera la `WORK_ORDER`.
 *
 * `approve` mueve el estado y crea la OT original en una sola
 * transacción: si la creación de la OT falla, la aprobación se revierte.
 */
@Injectable()
export class QuotesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly quotes: QuotesRepository,
    private readonly requests: RequestsRepository,
    private readonly workOrders: WorkOrdersService,
  ) {}

  /**
   * Alta de una cotización sobre una solicitud existente que aún no
   * tenga una (Épica 2 — "una solicitud, una cotización", ADR-0003).
   */
  async create(dto: CreateQuoteDto): Promise<Quote> {
    const request = await this.requests.findById(dto.requestId);
    if (request === null) {
      throw new NotFoundException(
        `No existe una solicitud con id "${dto.requestId}".`,
      );
    }

    const existing = await this.quotes.findByRequestId(dto.requestId);
    if (existing !== null) {
      throw new ConflictException(
        `La solicitud "${dto.requestId}" ya tiene una cotización (${existing.id}).`,
      );
    }

    return this.quotes.create({
      requestId: dto.requestId,
      amount: dto.amount,
    });
  }

  /** Detalle de una cotización con su solicitud y cliente. 404 si no existe. */
  async findOne(id: string): Promise<QuoteWithRelations> {
    const quote = await this.quotes.findByIdWithRelations(id);
    if (quote === null) {
      throw new NotFoundException(`No existe una cotización con id "${id}".`);
    }
    return quote;
  }

  /**
   * Registra la aprobación del cliente y genera la OT (Épica 2 + Épica 3
   * — "solo una cotización aprobada puede generar una OT"). Estado +
   * creación de la OT van en la misma transacción.
   */
  async approve(id: string): Promise<ApprovedQuote> {
    return this.prisma.$transaction(async (tx) => {
      await this.loadPending(id, tx);
      const approved = await this.quotes.updateStatus(
        id,
        QuoteStatus.approved,
        tx,
      );
      const workOrder = await this.workOrders.createFromApprovedQuote(id, tx);
      return { ...approved, workOrder };
    });
  }

  /** Registra el rechazo del cliente. No genera OT. */
  async reject(id: string): Promise<Quote> {
    await this.loadPending(id);
    return this.quotes.updateStatus(id, QuoteStatus.rejected);
  }

  /**
   * Panel de Comercial: lo que espera acción en un solo lugar —
   * solicitudes sin cotizar y cotizaciones pendientes de
   * aprobación/rechazo.
   */
  async commercialPanel(): Promise<CommercialPanel> {
    const [requestsPendingQuote, quotesPendingApproval] = await Promise.all([
      this.requests.findMany({ pendingQuote: true }),
      this.quotes.findManyByStatus(QuoteStatus.pending_approval),
    ]);
    return { requestsPendingQuote, quotesPendingApproval };
  }

  /**
   * Carga la cotización y exige que esté en `pending_approval`. 404 si
   * no existe; 409 si ya fue aprobada o rechazada (bloquea la acción
   * inválida — AC "bloquean acciones inválidas").
   */
  private async loadPending(
    id: string,
    tx?: Prisma.TransactionClient,
  ): Promise<Quote> {
    const quote = await this.quotes.findById(id, tx);
    if (quote === null) {
      throw new NotFoundException(`No existe una cotización con id "${id}".`);
    }
    if (quote.status !== QuoteStatus.pending_approval) {
      throw new ConflictException(
        `La cotización "${id}" está en estado "${quote.status}": solo se ` +
          'puede aprobar o rechazar una cotización en "pending_approval".',
      );
    }
    return quote;
  }
}
