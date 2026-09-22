import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { Operation, Prisma } from '../../generated/prisma/client';

/** Una `OPERATION` con su `ROUTE_SHEET` — para llegar al `workOrderId`. */
export type OperationWithRouteSheet = Prisma.OperationGetPayload<{
  include: { routeSheet: true };
}>;

const PENDING = 'pending';
const IN_PROGRESS = 'in_progress';
const COMPLETED = 'completed';

/**
 * Acceso a datos de `OPERATION` (Épica 6, issue #31). `start`/`finish`
 * usan optimistic concurrency (`updateMany` condicionado al `status`
 * previo) — mismo patrón que
 * `StatusHistoryRepository.updateWorkOrderStatus`: si `count !== 1`, la
 * operación ya no estaba en el estado esperado (ya iniciada/terminada, o
 * no existe) y el caller lo trata como conflicto.
 */
@Injectable()
export class OperationsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findById(id: string): Promise<OperationWithRouteSheet | null> {
    return this.prisma.operation.findUnique({
      where: { id },
      include: { routeSheet: true },
    });
  }

  /**
   * `pending -> in_progress`. `null` si ya no estaba `pending` — el
   * caller lo trata como conflicto. Relee la fila dentro del mismo `tx`
   * después del `updateMany` para devolver el `updatedAt` real que
   * `@updatedAt` acaba de persistir, no el que tenía antes de escribir.
   */
  async start(
    operationId: string,
    userId: string,
    startedAt: Date,
    tx?: Prisma.TransactionClient,
  ): Promise<Operation | null> {
    const client = tx ?? this.prisma;
    const { count } = await client.operation.updateMany({
      where: { id: operationId, status: PENDING },
      data: { status: IN_PROGRESS, startedByUserId: userId, startedAt },
    });
    if (count !== 1) return null;
    return client.operation.findUniqueOrThrow({ where: { id: operationId } });
  }

  /**
   * `in_progress -> completed`. `null` si ya no estaba `in_progress` —
   * mismo criterio de relectura post-`updateMany` que `start()`.
   */
  async finish(
    operationId: string,
    userId: string,
    finishedAt: Date,
    tx?: Prisma.TransactionClient,
  ): Promise<Operation | null> {
    const client = tx ?? this.prisma;
    const { count } = await client.operation.updateMany({
      where: { id: operationId, status: IN_PROGRESS },
      data: { status: COMPLETED, finishedByUserId: userId, finishedAt },
    });
    if (count !== 1) return null;
    return client.operation.findUniqueOrThrow({ where: { id: operationId } });
  }

  /**
   * Operaciones de la hoja de ruta que ya dejaron `pending` (iniciadas o
   * completadas). Cuando esto vale `1` justo después de un `start()`
   * exitoso, esa operación fue la primera — dispara `routed ->
   * in_production` (ver `OperationsService.start`).
   */
  countNotPending(
    routeSheetId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<number> {
    return (tx ?? this.prisma).operation.count({
      where: { routeSheetId, status: { not: PENDING } },
    });
  }

  /**
   * Operaciones de la hoja de ruta que todavía no están `completed`
   * (pendientes o en curso). Cuando esto vale `0` justo después de un
   * `finish()` exitoso, era la última — dispara `in_production ->
   * in_quality_control` (ver `OperationsService.finish`). Mientras sea
   * mayor a `0`, el paso a control de calidad queda bloqueado por
   * construcción: nunca se llama `transition()`.
   */
  countNotCompleted(
    routeSheetId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<number> {
    return (tx ?? this.prisma).operation.count({
      where: { routeSheetId, status: { not: COMPLETED } },
    });
  }
}
