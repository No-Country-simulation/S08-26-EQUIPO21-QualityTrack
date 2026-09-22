import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import type { Mocked } from 'vitest';
import { WorkOrdersService } from './work-orders.service';
import { WorkOrdersRepository } from './work-orders.repository';
import { WorkOrderStatus } from '../../generated/prisma/client';
import type { WorkOrder } from '../../generated/prisma/client';

const QUOTE_ID = '11111111-1111-1111-1111-111111111111';
const WO_ID = '33333333-3333-3333-3333-333333333333';

const buildWorkOrder = (over: Partial<WorkOrder> = {}): WorkOrder => ({
  id: WO_ID,
  quoteId: QUOTE_ID,
  status: WorkOrderStatus.created,
  createdAt: new Date('2026-09-09T10:00:00Z'),
  replacesWorkOrderId: null,
  ...over,
});

describe('WorkOrdersService', () => {
  let service: WorkOrdersService;
  let repo: Mocked<WorkOrdersRepository>;

  beforeEach(async () => {
    const repoMock: Partial<Mocked<WorkOrdersRepository>> = {
      createOriginal: vi.fn(),
      findById: vi.fn(),
      findOriginalByQuoteId: vi.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkOrdersService,
        { provide: WorkOrdersRepository, useValue: repoMock },
      ],
    }).compile();

    service = module.get(WorkOrdersService);
    repo = module.get(WorkOrdersRepository);
  });

  describe('createFromApprovedQuote', () => {
    it('crea la OT original en estado created cuando la cotización no tiene una', async () => {
      repo.findOriginalByQuoteId.mockResolvedValue(null);
      const created = buildWorkOrder();
      repo.createOriginal.mockResolvedValue(created);

      const result = await service.createFromApprovedQuote(QUOTE_ID);

      expect(result).toBe(created);
      expect(repo.createOriginal).toHaveBeenCalledWith(
        { quoteId: QUOTE_ID },
        undefined,
      );
    });

    it('propaga el transaction client al repositorio', async () => {
      repo.findOriginalByQuoteId.mockResolvedValue(null);
      repo.createOriginal.mockResolvedValue(buildWorkOrder());
      const tx = { marker: true } as never;

      await service.createFromApprovedQuote(QUOTE_ID, tx);

      expect(repo.findOriginalByQuoteId).toHaveBeenCalledWith(QUOTE_ID, tx);
      expect(repo.createOriginal).toHaveBeenCalledWith(
        { quoteId: QUOTE_ID },
        tx,
      );
    });

    it('rechaza con 409 si la cotización ya tiene una OT original', async () => {
      repo.findOriginalByQuoteId.mockResolvedValue(buildWorkOrder());

      await expect(
        service.createFromApprovedQuote(QUOTE_ID),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(repo.createOriginal).not.toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('devuelve la OT cuando existe', async () => {
      const wo = buildWorkOrder();
      repo.findById.mockResolvedValue(wo);

      await expect(service.findOne(WO_ID)).resolves.toBe(wo);
    });

    it('rechaza con 404 si no existe', async () => {
      repo.findById.mockResolvedValue(null);

      await expect(service.findOne(WO_ID)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('createRouteSheet', () => {
    const buildRouteSheet = (): RouteSheetWithOperations =>
      ({
        id: '55555555-5555-5555-5555-555555555555',
        workOrderId: WO_ID,
        sequence: 1,
        operations: [],
      }) as unknown as RouteSheetWithOperations;

    it('crea la hoja de ruta y transiciona la OT en la misma transacción', async () => {
      repo.findById.mockResolvedValue(buildWorkOrder());
      const created = buildRouteSheet();
      routeSheets.create.mockResolvedValue(created);
      statusHistory.transition.mockResolvedValue(
        buildWorkOrder({ status: WorkOrderStatus.routed }),
      );

      const result = await service.createRouteSheet(
        WO_ID,
        ['Torneado', 'Fresado'],
        USER_ID,
      );

      expect(result).toBe(created);
      expect(routeSheets.create).toHaveBeenCalledWith(
        WO_ID,
        ['Torneado', 'Fresado'],
        TX,
      );
      expect(statusHistory.transition).toHaveBeenCalledWith(
        WO_ID,
        WorkOrderEvent.Route,
        USER_ID,
        { tx: TX },
      );
    });

    it('rechaza con 404 si la OT no existe', async () => {
      repo.findById.mockResolvedValue(null);

      await expect(
        service.createRouteSheet(WO_ID, ['Torneado'], USER_ID),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(routeSheets.create).not.toHaveBeenCalled();
    });
  });

  describe('getRouteSheet', () => {
    it('devuelve la hoja de ruta cuando existe', async () => {
      const routeSheet = {
        id: '55555555-5555-5555-5555-555555555555',
        workOrderId: WO_ID,
        sequence: 1,
        operations: [],
      } as unknown as RouteSheetWithOperations;
      routeSheets.findByWorkOrderId.mockResolvedValue(routeSheet);

      await expect(service.getRouteSheet(WO_ID)).resolves.toBe(routeSheet);
    });

    it('rechaza con 404 si la OT todavía no tiene hoja de ruta', async () => {
      routeSheets.findByWorkOrderId.mockResolvedValue(null);

      await expect(service.getRouteSheet(WO_ID)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('findAll', () => {
    it('delega en el repositorio sin filtro', async () => {
      repo.findMany.mockResolvedValue([]);

      await service.findAll();

      expect(repo.findMany).toHaveBeenCalledWith({ status: undefined });
    });

    it('delega en el repositorio con el status', async () => {
      repo.findMany.mockResolvedValue([]);

      await service.findAll(WorkOrderStatus.routed);

      expect(repo.findMany).toHaveBeenCalledWith({
        status: WorkOrderStatus.routed,
      });
    });
  });
});
