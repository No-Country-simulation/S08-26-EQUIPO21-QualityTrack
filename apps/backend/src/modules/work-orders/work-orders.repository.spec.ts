import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException } from '@nestjs/common';
import { WorkOrdersRepository } from './work-orders.repository';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma, WorkOrderStatus } from '../../generated/prisma/client';
import type { WorkOrder } from '../../generated/prisma/client';

const QUOTE_ID = '11111111-1111-1111-1111-111111111111';

const buildWorkOrder = (over: Partial<WorkOrder> = {}): WorkOrder => ({
  id: '33333333-3333-3333-3333-333333333333',
  quoteId: QUOTE_ID,
  status: WorkOrderStatus.created,
  createdAt: new Date('2026-09-09T10:00:00Z'),
  replacesWorkOrderId: null,
  ...over,
});

describe('WorkOrdersRepository', () => {
  let repo: WorkOrdersRepository;
  let prisma: {
    workOrder: {
      create: ReturnType<typeof vi.fn>;
      findUnique: ReturnType<typeof vi.fn>;
      findFirst: ReturnType<typeof vi.fn>;
    };
  };

  beforeEach(async () => {
    prisma = {
      workOrder: {
        create: vi.fn(),
        findUnique: vi.fn(),
        findFirst: vi.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkOrdersRepository,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    repo = module.get(WorkOrdersRepository);
  });

  describe('createOriginal', () => {
    it('crea la OT en estado created a partir de la cotización', async () => {
      const created = buildWorkOrder();
      prisma.workOrder.create.mockResolvedValue(created);

      await expect(repo.createOriginal({ quoteId: QUOTE_ID })).resolves.toBe(
        created,
      );
      expect(prisma.workOrder.create).toHaveBeenCalledWith({
        data: {
          status: WorkOrderStatus.created,
          quote: { connect: { id: QUOTE_ID } },
        },
      });
    });

    it('traduce el P2002 del índice único parcial a ConflictException', async () => {
      prisma.workOrder.create.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
          code: 'P2002',
          clientVersion: 'test',
          meta: { target: 'work_order_quote_id_original_key' },
        }),
      );

      await expect(
        repo.createOriginal({ quoteId: QUOTE_ID }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('usa el transaction client cuando se le pasa uno', async () => {
      const tx = {
        workOrder: { create: vi.fn().mockResolvedValue(buildWorkOrder()) },
      } as never;

      await repo.createOriginal({ quoteId: QUOTE_ID }, tx);

      expect(
        (tx as { workOrder: { create: ReturnType<typeof vi.fn> } }).workOrder
          .create,
      ).toHaveBeenCalled();
      expect(prisma.workOrder.create).not.toHaveBeenCalled();
    });
  });

  describe('findOriginalByQuoteId', () => {
    it('busca la OT sin replacesWorkOrderId de esa cotización', async () => {
      prisma.workOrder.findFirst.mockResolvedValue(null);

      await repo.findOriginalByQuoteId(QUOTE_ID);

      expect(prisma.workOrder.findFirst).toHaveBeenCalledWith({
        where: { quoteId: QUOTE_ID, replacesWorkOrderId: null },
      });
    });
  });
});
