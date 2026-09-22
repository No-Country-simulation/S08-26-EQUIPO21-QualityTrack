import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { Prisma } from '../../generated/prisma/client';

/** Un `ROUTE_SHEET` con sus `OPERATION`, ordenadas por `sequence`. */
export type RouteSheetWithOperations = Prisma.RouteSheetGetPayload<{
  include: { operations: true };
}>;

/**
 * Acceso a datos de `ROUTE_SHEET` (Épica 6, issue #31). No toca
 * `work_order.status` ni `status_history` (ADR-0005) — eso lo hace
 * `StatusHistoryService.transition()`, llamado desde
 * `WorkOrdersService.createRouteSheet()` en la misma transacción que
 * `create()`.
 *
 * Siempre se crea una única hoja de ruta por OT en el MVP (`sequence:
 * 1`): la máquina de estados de `status-history` ya impide una segunda
 * — `created -> routed` solo es legal una vez.
 */
@Injectable()
export class RouteSheetsRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Crea la hoja de ruta y sus operaciones en un solo `create` anidado.
   * `operationTypes` llega en el orden de fabricación: el índice del
   * array (+1) es `sequence`.
   */
  create(
    workOrderId: string,
    operationTypes: string[],
    tx: Prisma.TransactionClient,
  ): Promise<RouteSheetWithOperations> {
    return tx.routeSheet.create({
      data: {
        sequence: 1,
        workOrder: { connect: { id: workOrderId } },
        operations: {
          create: operationTypes.map((type, index) => ({
            sequence: index + 1,
            type,
            status: 'pending',
          })),
        },
      },
      include: { operations: { orderBy: { sequence: 'asc' } } },
    });
  }

  /** La hoja de ruta de una OT con sus operaciones. `null` si no tiene. */
  findByWorkOrderId(
    workOrderId: string,
  ): Promise<RouteSheetWithOperations | null> {
    return this.prisma.routeSheet.findFirst({
      where: { workOrderId },
      include: { operations: { orderBy: { sequence: 'asc' } } },
    });
  }
}
