import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { OperationsRepository } from './operations.repository';
import { StatusHistoryService } from '../status-history/status-history.service';
import { WorkOrderEvent } from '../status-history/work-order-event';
import type { Operation } from '../../generated/prisma/client';

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

      const notPending = await this.operations.countNotPending(
        routeSheet.id,
        tx,
      );
      if (notPending === 1) {
        await this.statusHistory.transition(
          routeSheet.workOrderId,
          WorkOrderEvent.StartProduction,
          userId,
          { tx },
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

      const notCompleted = await this.operations.countNotCompleted(
        routeSheet.id,
        tx,
      );
      if (notCompleted === 0) {
        await this.statusHistory.transition(
          routeSheet.workOrderId,
          WorkOrderEvent.SendToQualityControl,
          userId,
          { tx },
        );
      }

      return updated;
    });
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
