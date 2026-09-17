import { WorkOrderStatus } from '../../generated/prisma/client';
import { WorkOrderEvent } from './work-order-event';
import {
  getNextStatus,
  hasReachedReprocessLimit,
} from './work-order-state-machine';

describe('work-order-state-machine', () => {
  describe('getNextStatus — transiciones válidas (docs/architecture.md)', () => {
    it.each([
      [WorkOrderStatus.created, WorkOrderEvent.Route, WorkOrderStatus.routed],
      [
        WorkOrderStatus.routed,
        WorkOrderEvent.StartProduction,
        WorkOrderStatus.in_production,
      ],
      [
        WorkOrderStatus.in_production,
        WorkOrderEvent.SendToQualityControl,
        WorkOrderStatus.in_quality_control,
      ],
      [
        WorkOrderStatus.in_quality_control,
        WorkOrderEvent.Deliver,
        WorkOrderStatus.delivered,
      ],
      [
        WorkOrderStatus.in_quality_control,
        WorkOrderEvent.MarkNonconforming,
        WorkOrderStatus.nonconforming,
      ],
      [
        WorkOrderStatus.nonconforming,
        WorkOrderEvent.Reprocess,
        WorkOrderStatus.in_production,
      ],
      [
        WorkOrderStatus.created,
        WorkOrderEvent.Cancel,
        WorkOrderStatus.cancelled,
      ],
      [
        WorkOrderStatus.routed,
        WorkOrderEvent.Cancel,
        WorkOrderStatus.cancelled,
      ],
      [
        WorkOrderStatus.in_production,
        WorkOrderEvent.Cancel,
        WorkOrderStatus.cancelled,
      ],
      [
        WorkOrderStatus.in_quality_control,
        WorkOrderEvent.Cancel,
        WorkOrderStatus.cancelled,
      ],
      [
        WorkOrderStatus.nonconforming,
        WorkOrderEvent.Cancel,
        WorkOrderStatus.cancelled,
      ],
    ])('%s + %s -> %s', (current, event, expected) => {
      expect(getNextStatus(current, event)).toBe(expected);
    });
  });

  describe('getNextStatus — rechaza transiciones no listadas', () => {
    it.each([
      [WorkOrderStatus.created, WorkOrderEvent.StartProduction],
      [WorkOrderStatus.created, WorkOrderEvent.Deliver],
      [WorkOrderStatus.routed, WorkOrderEvent.Route],
      [WorkOrderStatus.routed, WorkOrderEvent.MarkNonconforming],
      [WorkOrderStatus.in_production, WorkOrderEvent.Deliver],
      [WorkOrderStatus.in_production, WorkOrderEvent.Reprocess],
      [WorkOrderStatus.in_quality_control, WorkOrderEvent.Reprocess],
      [WorkOrderStatus.nonconforming, WorkOrderEvent.Deliver],
      [WorkOrderStatus.nonconforming, WorkOrderEvent.StartProduction],
    ])('%s + %s -> undefined', (current, event) => {
      expect(getNextStatus(current, event)).toBeUndefined();
    });

    it('delivered es terminal: ningún evento tiene salida, ni Cancel (ADR-0006)', () => {
      for (const event of Object.values(WorkOrderEvent)) {
        expect(getNextStatus(WorkOrderStatus.delivered, event)).toBeUndefined();
      }
    });

    it('cancelled es terminal: ningún evento tiene salida', () => {
      for (const event of Object.values(WorkOrderEvent)) {
        expect(getNextStatus(WorkOrderStatus.cancelled, event)).toBeUndefined();
      }
    });
  });

  describe('hasReachedReprocessLimit (ADR-0002: hasta 3 vueltas por OT)', () => {
    it.each([0, 1, 2, 3])(
      'con %i no conformidades previas, el límite no está agotado',
      (count) => {
        expect(hasReachedReprocessLimit(count)).toBe(false);
      },
    );

    it.each([4, 5, 10])(
      'con %i no conformidades previas, el límite está agotado',
      (count) => {
        expect(hasReachedReprocessLimit(count)).toBe(true);
      },
    );
  });
});
