import { Test, TestingModule } from '@nestjs/testing';
import { OperationsRepository } from './operations.repository';
import { PrismaService } from '../../prisma/prisma.service';

const OPERATION_ID = '66666666-6666-6666-6666-666666666666';
const ROUTE_SHEET_ID = '55555555-5555-5555-5555-555555555555';
const USER_ID = '44444444-4444-4444-4444-444444444444';
const NOW = new Date('2026-09-22T10:00:00Z');

describe('OperationsRepository', () => {
  let repo: OperationsRepository;
  let prisma: {
    operation: {
      findUnique: ReturnType<typeof vi.fn>;
      updateMany: ReturnType<typeof vi.fn>;
      count: ReturnType<typeof vi.fn>;
    };
  };

  beforeEach(async () => {
    prisma = {
      operation: {
        findUnique: vi.fn(),
        updateMany: vi.fn(),
        count: vi.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OperationsRepository,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    repo = module.get(OperationsRepository);
  });

  describe('findById', () => {
    it('busca la operación con su hoja de ruta', async () => {
      prisma.operation.findUnique.mockResolvedValue(null);

      await repo.findById(OPERATION_ID);

      expect(prisma.operation.findUnique).toHaveBeenCalledWith({
        where: { id: OPERATION_ID },
        include: { routeSheet: true },
      });
    });
  });

  describe('start', () => {
    it('actualiza pending -> in_progress y devuelve true si afectó una fila', async () => {
      prisma.operation.updateMany.mockResolvedValue({ count: 1 });

      await expect(repo.start(OPERATION_ID, USER_ID, NOW)).resolves.toBe(true);
      expect(prisma.operation.updateMany).toHaveBeenCalledWith({
        where: { id: OPERATION_ID, status: 'pending' },
        data: {
          status: 'in_progress',
          startedByUserId: USER_ID,
          startedAt: NOW,
        },
      });
    });

    it('devuelve false si la operación ya no estaba pending', async () => {
      prisma.operation.updateMany.mockResolvedValue({ count: 0 });

      await expect(repo.start(OPERATION_ID, USER_ID, NOW)).resolves.toBe(false);
    });

    it('usa el transaction client cuando se le pasa uno', async () => {
      const tx = {
        operation: { updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
      } as never;

      await repo.start(OPERATION_ID, USER_ID, NOW, tx);

      expect(
        (tx as { operation: { updateMany: ReturnType<typeof vi.fn> } })
          .operation.updateMany,
      ).toHaveBeenCalled();
      expect(prisma.operation.updateMany).not.toHaveBeenCalled();
    });
  });

  describe('finish', () => {
    it('actualiza in_progress -> completed y devuelve true si afectó una fila', async () => {
      prisma.operation.updateMany.mockResolvedValue({ count: 1 });

      await expect(repo.finish(OPERATION_ID, USER_ID, NOW)).resolves.toBe(true);
      expect(prisma.operation.updateMany).toHaveBeenCalledWith({
        where: { id: OPERATION_ID, status: 'in_progress' },
        data: {
          status: 'completed',
          finishedByUserId: USER_ID,
          finishedAt: NOW,
        },
      });
    });

    it('devuelve false si la operación ya no estaba in_progress', async () => {
      prisma.operation.updateMany.mockResolvedValue({ count: 0 });

      await expect(repo.finish(OPERATION_ID, USER_ID, NOW)).resolves.toBe(
        false,
      );
    });
  });

  describe('countNotPending', () => {
    it('cuenta las operaciones de la hoja de ruta que ya no están pending', async () => {
      prisma.operation.count.mockResolvedValue(1);

      await expect(repo.countNotPending(ROUTE_SHEET_ID)).resolves.toBe(1);
      expect(prisma.operation.count).toHaveBeenCalledWith({
        where: { routeSheetId: ROUTE_SHEET_ID, status: { not: 'pending' } },
      });
    });
  });

  describe('countNotCompleted', () => {
    it('cuenta las operaciones de la hoja de ruta que todavía no están completed', async () => {
      prisma.operation.count.mockResolvedValue(0);

      await expect(repo.countNotCompleted(ROUTE_SHEET_ID)).resolves.toBe(0);
      expect(prisma.operation.count).toHaveBeenCalledWith({
        where: { routeSheetId: ROUTE_SHEET_ID, status: { not: 'completed' } },
      });
    });
  });
});
