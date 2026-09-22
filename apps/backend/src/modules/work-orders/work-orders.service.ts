import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { WorkOrdersRepository } from './work-orders.repository';
import type { WorkOrderWithRelations } from './work-orders.repository';
import { RouteSheetsRepository } from './route-sheets.repository';
import type { RouteSheetWithOperations } from './route-sheets.repository';
import { StatusHistoryService } from '../status-history/status-history.service';
import { WorkOrderEvent } from '../status-history/work-order-event';
import type {
  Prisma,
  WorkOrder,
  WorkOrderStatus,
} from '../../generated/prisma/client';

/**
 * Producción — `WORK_ORDER`, `ROUTE_SHEET` y `OPERATION` (Épica 3 y
 * Épica 6). Cubre el alta de la OT que nace de una cotización aprobada,
 * su consulta básica, y el alta + consulta de la hoja de ruta. Las
 * operaciones individuales (`start`/`finish`) viven en
 * `OperationsService` — este service solo arma la hoja de ruta
 * completa. Las transiciones de estado siempre se delegan en
 * `StatusHistoryService.transition()` (ADR-0005), nunca se tocan acá.
 */
@Injectable()
export class WorkOrdersService {
  constructor(
    private readonly workOrders: WorkOrdersRepository,
    private readonly routeSheets: RouteSheetsRepository,
    private readonly statusHistory: StatusHistoryService,
    private readonly prisma: PrismaService,
  ) {}

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

  /**
   * Da de alta la hoja de ruta de una OT y la transiciona `created ->
   * routed`, en una sola transacción: si una falla, la otra se revierte
   * (Épica 6, issue #31). `operationTypes` llega en orden de
   * fabricación.
   *
   * No se valida a mano que la OT esté en `created`: la máquina de
   * estados de `status-history` ya rechaza con 409 cualquier otro caso
   * al intentar `WorkOrderEvent.Route` — lo mismo impide una segunda
   * hoja de ruta, porque esa transición solo es legal una vez.
   */
  async createRouteSheet(
    workOrderId: string,
    operationTypes: string[],
    userId: string,
  ): Promise<RouteSheetWithOperations> {
    await this.findOne(workOrderId);
    return this.prisma.$transaction(async (tx) => {
      const routeSheet = await this.routeSheets.create(
        workOrderId,
        operationTypes,
        tx,
      );
      await this.statusHistory.transition(
        workOrderId,
        WorkOrderEvent.Route,
        userId,
        { tx },
      );
      return routeSheet;
    });
  }

  /**
   * Hoja de ruta de una OT con sus operaciones, ordenadas 1..N. Valida
   * primero que la OT exista (`findOne`, 404 propio) para distinguir "OT
   * inexistente" de "OT sin hoja de ruta todavía" — mismo mensaje 404 en
   * ambos casos sin esto, engañoso para quien consuma la API.
   */
  async getRouteSheet(workOrderId: string): Promise<RouteSheetWithOperations> {
    await this.findOne(workOrderId);
    const routeSheet = await this.routeSheets.findByWorkOrderId(workOrderId);
    if (routeSheet === null) {
      throw new NotFoundException(
        `La orden de trabajo "${workOrderId}" todavía no tiene hoja de ruta.`,
      );
    }
    return routeSheet;
  }

  /**
   * Listado de OT con cotización, solicitud y cliente (issue #69: el
   * tablero de Producción). Con `status` filtra por un único estado; sin
   * él devuelve todas. El agrupamiento en tabs ("Pendientes de ruta, En
   * producción, En calidad") lo arma el frontend en el cliente — mismo
   * patrón que `CommercialPage`, que agrupa Solicitudes/Cotizaciones sin
   * pedirle al backend una respuesta pre-agrupada.
   */
  findAll(status?: WorkOrderStatus): Promise<WorkOrderWithRelations[]> {
    return this.workOrders.findMany({ status });
  }
}
