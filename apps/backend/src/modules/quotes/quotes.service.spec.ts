import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import type { Mocked } from 'vitest';
import { QuotesService } from './quotes.service';
import { QuotesRepository } from './quotes.repository';
import { RequestsRepository } from './requests.repository';
import { WorkOrdersService } from '../work-orders/work-orders.service';
import { PrismaService } from '../../prisma/prisma.service';
import {
  Prisma,
  QuoteStatus,
  WorkOrderStatus,
} from '../../generated/prisma/client';
import type { Quote, Request, WorkOrder } from '../../generated/prisma/client';

const REQUEST_ID = '22222222-2222-2222-2222-222222222222';
const QUOTE_ID = '11111111-1111-1111-1111-111111111111';
const WO_ID = '33333333-3333-3333-3333-333333333333';

const buildRequest = (over: Partial<Request> = {}): Request => ({
  id: REQUEST_ID,
  customerId: '99999999-9999-9999-9999-999999999999',
  description: 'Torneado de 20 ejes',
  createdAt: new Date('2026-09-08T10:00:00Z'),
  ...over,
});

const buildQuote = (over: Partial<Quote> = {}): Quote => ({
  id: QUOTE_ID,
  requestId: REQUEST_ID,
  status: QuoteStatus.pending_approval,
  amount: new Prisma.Decimal('15000.50'),
  createdAt: new Date('2026-09-09T09:00:00Z'),
  updatedAt: new Date('2026-09-09T09:00:00Z'),
  ...over,
});

const buildWorkOrder = (over: Partial<WorkOrder> = {}): WorkOrder => ({
  id: WO_ID,
  quoteId: QUOTE_ID,
  status: WorkOrderStatus.created,
  createdAt: new Date('2026-09-09T10:00:00Z'),
  replacesWorkOrderId: null,
  ...over,
});

describe('QuotesService', () => {
  let service: QuotesService;
  let quotes: Mocked<QuotesRepository>;
  let requests: Mocked<RequestsRepository>;
  let workOrders: Mocked<WorkOrdersService>;

  beforeEach(async () => {
    const quotesMock: Partial<Mocked<QuotesRepository>> = {
      create: vi.fn(),
      findById: vi.fn(),
      findByRequestId: vi.fn(),
      findByIdWithRelations: vi.fn(),
      findManyByStatus: vi.fn(),
      updateStatus: vi.fn(),
    };
    const requestsMock: Partial<Mocked<RequestsRepository>> = {
      findById: vi.fn(),
      findMany: vi.fn(),
    };
    const workOrdersMock: Partial<Mocked<WorkOrdersService>> = {
      createFromApprovedQuote: vi.fn(),
    };
    // $transaction ejecuta el callback con un tx dummy, como haría Prisma.
    const prismaMock = {
      $transaction: vi.fn((cb: (tx: unknown) => unknown) => cb({ tx: true })),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QuotesService,
        { provide: QuotesRepository, useValue: quotesMock },
        { provide: RequestsRepository, useValue: requestsMock },
        { provide: WorkOrdersService, useValue: workOrdersMock },
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = module.get(QuotesService);
    quotes = module.get(QuotesRepository);
    requests = module.get(RequestsRepository);
    workOrders = module.get(WorkOrdersService);
  });

  describe('create (AC1 US-03)', () => {
    it('crea la cotización cuando la solicitud existe y no tiene otra', async () => {
      requests.findById.mockResolvedValue(buildRequest());
      quotes.findByRequestId.mockResolvedValue(null);
      const created = buildQuote();
      quotes.create.mockResolvedValue(created);

      const result = await service.create({
        requestId: REQUEST_ID,
        amount: 15000.5,
      });

      expect(result).toBe(created);
      expect(quotes.create).toHaveBeenCalledWith({
        requestId: REQUEST_ID,
        amount: 15000.5,
      });
    });

    it('rechaza con 404 si la solicitud no existe', async () => {
      requests.findById.mockResolvedValue(null);

      await expect(
        service.create({ requestId: REQUEST_ID, amount: 100 }),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(quotes.create).not.toHaveBeenCalled();
    });

    it('rechaza con 409 si la solicitud ya tiene una cotización', async () => {
      requests.findById.mockResolvedValue(buildRequest());
      quotes.findByRequestId.mockResolvedValue(buildQuote());

      await expect(
        service.create({ requestId: REQUEST_ID, amount: 100 }),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(quotes.create).not.toHaveBeenCalled();
    });
  });

  describe('approve (AC1/AC2 US-05)', () => {
    it('mueve la cotización a approved y genera la OT en una transacción', async () => {
      quotes.findById.mockResolvedValue(buildQuote());
      const approved = buildQuote({ status: QuoteStatus.approved });
      quotes.updateStatus.mockResolvedValue(approved);
      const workOrder = buildWorkOrder();
      workOrders.createFromApprovedQuote.mockResolvedValue(workOrder);

      const result = await service.approve(QUOTE_ID);

      expect(result).toEqual({ ...approved, workOrder });
      expect(quotes.updateStatus).toHaveBeenCalledWith(
        QUOTE_ID,
        QuoteStatus.approved,
        { tx: true },
      );
      expect(workOrders.createFromApprovedQuote).toHaveBeenCalledWith(
        QUOTE_ID,
        { tx: true },
      );
    });

    it('rechaza con 404 si la cotización no existe', async () => {
      quotes.findById.mockResolvedValue(null);

      await expect(service.approve(QUOTE_ID)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(quotes.updateStatus).not.toHaveBeenCalled();
    });

    it('rechaza con 409 si la cotización no está en pending_approval', async () => {
      quotes.findById.mockResolvedValue(
        buildQuote({ status: QuoteStatus.rejected }),
      );

      await expect(service.approve(QUOTE_ID)).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(quotes.updateStatus).not.toHaveBeenCalled();
      expect(workOrders.createFromApprovedQuote).not.toHaveBeenCalled();
    });
  });

  describe('reject (AC1/AC2 US-05)', () => {
    it('mueve la cotización a rejected sin generar OT', async () => {
      quotes.findById.mockResolvedValue(buildQuote());
      const rejected = buildQuote({ status: QuoteStatus.rejected });
      quotes.updateStatus.mockResolvedValue(rejected);

      const result = await service.reject(QUOTE_ID);

      expect(result).toBe(rejected);
      expect(quotes.updateStatus).toHaveBeenCalledWith(
        QUOTE_ID,
        QuoteStatus.rejected,
      );
      expect(workOrders.createFromApprovedQuote).not.toHaveBeenCalled();
    });

    it('rechaza con 409 si la cotización ya fue aprobada', async () => {
      quotes.findById.mockResolvedValue(
        buildQuote({ status: QuoteStatus.approved }),
      );

      await expect(service.reject(QUOTE_ID)).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(quotes.updateStatus).not.toHaveBeenCalled();
    });
  });

  describe('commercialPanel (AC1 US-04)', () => {
    it('devuelve solicitudes sin cotizar y cotizaciones pendientes de aprobación', async () => {
      const pendingRequests = [buildRequest()];
      const pendingQuotes = [
        { ...buildQuote(), request: { ...buildRequest(), customer: null } },
      ] as never;
      requests.findMany.mockResolvedValue(pendingRequests);
      quotes.findManyByStatus.mockResolvedValue(pendingQuotes);

      const result = await service.commercialPanel();

      expect(result).toEqual({
        requestsPendingQuote: pendingRequests,
        quotesPendingApproval: pendingQuotes,
      });
      expect(requests.findMany).toHaveBeenCalledWith({ pendingQuote: true });
      expect(quotes.findManyByStatus).toHaveBeenCalledWith(
        QuoteStatus.pending_approval,
      );
    });
  });

  describe('findOne', () => {
    it('devuelve la cotización con relaciones', async () => {
      const withRelations = {
        ...buildQuote(),
        request: { ...buildRequest(), customer: null },
      } as never;
      quotes.findByIdWithRelations.mockResolvedValue(withRelations);

      await expect(service.findOne(QUOTE_ID)).resolves.toBe(withRelations);
    });

    it('rechaza con 404 si no existe', async () => {
      quotes.findByIdWithRelations.mockResolvedValue(null);

      await expect(service.findOne(QUOTE_ID)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });
});
