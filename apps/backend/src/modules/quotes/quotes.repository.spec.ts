import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException } from '@nestjs/common';
import { QuotesRepository } from './quotes.repository';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma, QuoteStatus } from '../../generated/prisma/client';
import type { Quote } from '../../generated/prisma/client';

const REQUEST_ID = '22222222-2222-2222-2222-222222222222';

const p2002 = () =>
  new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
    code: 'P2002',
    clientVersion: 'test',
    meta: { target: ['request_id'] },
  });

const buildQuote = (over: Partial<Quote> = {}): Quote => ({
  id: '11111111-1111-1111-1111-111111111111',
  requestId: REQUEST_ID,
  status: QuoteStatus.pending_approval,
  amount: new Prisma.Decimal('15000.50'),
  createdAt: new Date('2026-09-09T09:00:00Z'),
  updatedAt: new Date('2026-09-09T09:00:00Z'),
  ...over,
});

describe('QuotesRepository', () => {
  let repo: QuotesRepository;
  let prisma: {
    quote: {
      create: ReturnType<typeof vi.fn>;
      findUnique: ReturnType<typeof vi.fn>;
      findMany: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
    };
  };

  beforeEach(async () => {
    prisma = {
      quote: {
        create: vi.fn(),
        findUnique: vi.fn(),
        findMany: vi.fn(),
        update: vi.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QuotesRepository,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    repo = module.get(QuotesRepository);
  });

  describe('create', () => {
    it('devuelve la cotización creada en el camino feliz', async () => {
      const created = buildQuote();
      prisma.quote.create.mockResolvedValue(created);

      await expect(
        repo.create({ requestId: REQUEST_ID, amount: 15000.5 }),
      ).resolves.toBe(created);
      expect(prisma.quote.create).toHaveBeenCalledWith({
        data: {
          status: QuoteStatus.pending_approval,
          amount: new Prisma.Decimal(15000.5),
          request: { connect: { id: REQUEST_ID } },
        },
      });
    });

    it('traduce el P2002 de request_id a ConflictException', async () => {
      prisma.quote.create.mockRejectedValue(p2002());

      await expect(
        repo.create({ requestId: REQUEST_ID, amount: 100 }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('propaga sin tocar cualquier otro error de Prisma', async () => {
      const other = new Prisma.PrismaClientKnownRequestError('boom', {
        code: 'P2003',
        clientVersion: 'test',
      });
      prisma.quote.create.mockRejectedValue(other);

      await expect(
        repo.create({ requestId: REQUEST_ID, amount: 100 }),
      ).rejects.toBe(other);
    });
  });

  describe('updateStatus', () => {
    it('usa el transaction client cuando se le pasa uno', async () => {
      const tx = {
        quote: { update: vi.fn().mockResolvedValue(buildQuote()) },
      } as never;

      await repo.updateStatus(
        '11111111-1111-1111-1111-111111111111',
        QuoteStatus.approved,
        tx,
      );

      expect(
        (tx as { quote: { update: ReturnType<typeof vi.fn> } }).quote.update,
      ).toHaveBeenCalledWith({
        where: { id: '11111111-1111-1111-1111-111111111111' },
        data: { status: QuoteStatus.approved },
      });
      expect(prisma.quote.update).not.toHaveBeenCalled();
    });

    it('usa el cliente Prisma por defecto sin transaction client', async () => {
      prisma.quote.update.mockResolvedValue(buildQuote());

      await repo.updateStatus(
        '11111111-1111-1111-1111-111111111111',
        QuoteStatus.rejected,
      );

      expect(prisma.quote.update).toHaveBeenCalledWith({
        where: { id: '11111111-1111-1111-1111-111111111111' },
        data: { status: QuoteStatus.rejected },
      });
    });
  });

  describe('findManyByStatus', () => {
    it('filtra por estado e incluye solicitud y cliente, más viejas primero', async () => {
      prisma.quote.findMany.mockResolvedValue([]);

      await repo.findManyByStatus(QuoteStatus.pending_approval);

      expect(prisma.quote.findMany).toHaveBeenCalledWith({
        where: { status: QuoteStatus.pending_approval },
        include: { request: { include: { customer: true } } },
        orderBy: { createdAt: 'asc' },
      });
    });
  });
});
