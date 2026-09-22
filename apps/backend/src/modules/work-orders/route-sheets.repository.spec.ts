import { Test, TestingModule } from '@nestjs/testing';
import { RouteSheetsRepository } from './route-sheets.repository';
import { PrismaService } from '../../prisma/prisma.service';

const WO_ID = '33333333-3333-3333-3333-333333333333';

describe('RouteSheetsRepository', () => {
  let repo: RouteSheetsRepository;
  let prisma: {
    routeSheet: {
      create: ReturnType<typeof vi.fn>;
      findFirst: ReturnType<typeof vi.fn>;
    };
  };

  beforeEach(async () => {
    prisma = {
      routeSheet: {
        create: vi.fn(),
        findFirst: vi.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RouteSheetsRepository,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    repo = module.get(RouteSheetsRepository);
  });

  describe('create', () => {
    it('crea la hoja de ruta con sus operaciones numeradas 1..N, dentro del tx recibido', async () => {
      const tx = {
        routeSheet: { create: vi.fn().mockResolvedValue({ id: 'rs-1' }) },
      } as never;

      await repo.create(WO_ID, ['Torneado', 'Fresado', 'Soldadura'], tx);

      expect(
        (tx as { routeSheet: { create: ReturnType<typeof vi.fn> } }).routeSheet
          .create,
      ).toHaveBeenCalledWith({
        data: {
          sequence: 1,
          workOrder: { connect: { id: WO_ID } },
          operations: {
            create: [
              { sequence: 1, type: 'Torneado', status: 'pending' },
              { sequence: 2, type: 'Fresado', status: 'pending' },
              { sequence: 3, type: 'Soldadura', status: 'pending' },
            ],
          },
        },
        include: { operations: { orderBy: { sequence: 'asc' } } },
      });
      expect(prisma.routeSheet.create).not.toHaveBeenCalled();
    });
  });

  describe('findByWorkOrderId', () => {
    it('busca la hoja de ruta de la OT con sus operaciones ordenadas', async () => {
      prisma.routeSheet.findFirst.mockResolvedValue(null);

      await repo.findByWorkOrderId(WO_ID);

      expect(prisma.routeSheet.findFirst).toHaveBeenCalledWith({
        where: { workOrderId: WO_ID },
        include: { operations: { orderBy: { sequence: 'asc' } } },
      });
    });
  });
});
