import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { OperationsRepository } from './operations.repository';
import { StatusHistoryService } from '../status-history/status-history.service';
import { WorkOrderEvent } from '../status-history/work-order-event';
import { WorkOrderStatus } from '../../generated/prisma/client';
import type { Operation, Prisma } from '../../generated/prisma/client';

/**
 * `start`/`finish` de una `OPERATION` (Épica 6, issue #31). Cada uno
 * abre su propia transacción: actualiza la operación (optimistic
 * concurrency) y, si corresponde, transiciona la OT en la misma
 * transacción — nunca por separado (regla de `CLAUDE.md`).
 *
 * - `start` de la primera operación que deja `pending` dispara `routed
 *   -> in_production`.
 * - `finish` de la última que llega a `completed` dispara `in_production
 *   -> in_quality_control`. Mientras quede alguna sin completar, esa
 *   transición nunca se llama — así se bloquea el paso a control de
 *   calidad (AC3 de #31), sin un guard aparte.
 */
@Injectable()
export class OperationsService {
  constructor(
    private readonly operations: OperationsRepository,
    private readonly statusHistory: StatusHistoryService,
    private readonly prisma: PrismaService,
  ) {}

  async start(operationId: string, userId: string): Promise<Operation> {
    const { routeSheet } = await this.load(operationId);
    const startedAt = new Date();

    return this.prisma.$transaction(async (tx) => {
      const updated = await this.operations.start(
        operationId,
        userId,
        startedAt,
        tx,
      );
      if (updated === null) {
        throw new ConflictException(
          `La operación "${operationId}" no está pendiente de iniciar.`,
        );
      }

      // `notPending === 1` es un umbral bajo: dos operaciones que
      // arrancan a la vez pueden verlo cada una desde su propia
      // transacción (todavía no ven el commit de la otra) y las dos
      // creerse "la primera" — de ahí `transitionIdempotently`.
      const notPending = await this.operations.countNotPending(
        routeSheet.id,
        tx,
      );
      if (notPending === 1) {
        await this.transitionIdempotently(
          routeSheet.workOrderId,
          WorkOrderEvent.StartProduction,
          WorkOrderStatus.in_production,
          userId,
          tx,
        );
      }

      return updated;
    });
  }

  async finish(operationId: string, userId: string): Promise<Operation> {
    const { routeSheet } = await this.load(operationId);
    const finishedAt = new Date();

    return this.prisma.$transaction(async (tx) => {
      const updated = await this.operations.finish(
        operationId,
        userId,
        finishedAt,
        tx,
      );
      if (updated === null) {
        throw new ConflictException(
          `La operación "${operationId}" no está en curso.`,
        );
      }

      // `notCompleted === 0` es, al revés que en `start`, un umbral
      // alto: exige ver comprometidas TODAS las demás operaciones. Bajo
      // alta concurrencia, dos `finish()` que terminan casi a la vez
      // pueden ver cada uno "todavía queda 1" (la del otro, sin
      // commitear todavía) y ninguno dispare esta transición — al
      // revés del 409 espurio de `start`, acá el riesgo es que la OT se
      // quede sin pasar a `in_quality_control`. No se resuelve acá
      // (exigiría serializar con un lock explícito sobre la hoja de
      // ruta, p. ej. `SELECT ... FOR UPDATE`); dado que un solo
      // operario de Planta ejecuta operaciones (ux-research-brief.md),
      // el riesgo real es bajo. Revisar si el uso real lo contradice.
      const notCompleted = await this.operations.countNotCompleted(
        routeSheet.id,
        tx,
      );
      if (notCompleted === 0) {
        await this.transitionIdempotently(
          routeSheet.workOrderId,
          WorkOrderEvent.SendToQualityControl,
          WorkOrderStatus.in_quality_control,
          userId,
          tx,
        );
      }

      return updated;
    });
  }

  /**
   * Dispara `event` sobre la OT. Si `transition()` rechaza con 409 por
   * una transición concurrente que ya la movió (optimistic concurrency
   * de `StatusHistoryService.updateWorkOrderStatus`), no es un
   * conflicto real para *esta* llamada cuando la OT ya quedó
   * exactamente en `expectedStatus` — otra operación ganó la misma
   * carrera legítima y el resultado es el mismo. Solo se relanza si
   * terminó en un estado distinto (p. ej. cancelada mientras tanto).
   */
  private async transitionIdempotently(
    workOrderId: string,
    event: WorkOrderEvent,
    expectedStatus: WorkOrderStatus,
    userId: string,
    tx: Prisma.TransactionClient,
  ): Promise<void> {
    try {
      await this.statusHistory.transition(workOrderId, event, userId, { tx });
    } catch (error) {
      if (!(error instanceof ConflictException)) {
        throw error;
      }
      const workOrder = await tx.workOrder.findUniqueOrThrow({
        where: { id: workOrderId },
      });
      if (workOrder.status !== expectedStatus) {
        throw error;
      }
    }
  }

  private async load(operationId: string) {
    const operation = await this.operations.findById(operationId);
    if (operation === null) {
      throw new NotFoundException(
        `No existe una operación con id "${operationId}".`,
      );
    }
    return operation;
  }
}
