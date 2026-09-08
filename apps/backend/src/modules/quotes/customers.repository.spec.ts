import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException } from '@nestjs/common';
import { CustomersRepository } from './customers.repository';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '../../generated/prisma/client';
import type { Customer } from '../../generated/prisma/client';

const buildCustomer = (over: Partial<Customer> = {}): Customer => ({
  id: '11111111-1111-1111-1111-111111111111',
  name: 'Mecánica Sur SA',
  taxId: '30-12345678-9',
  email: 'compras@sur.example',
  phone: null,
  address: null,
  archivedAt: null,
  ...over,
});

const p2002 = (target: string[] | string) =>
  new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
    code: 'P2002',
    clientVersion: 'test',
    meta: { target },
  });

describe('CustomersRepository', () => {
  let repo: CustomersRepository;
  let prisma: {
    customer: {
      create: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
      findMany: ReturnType<typeof vi.fn>;
      findUnique: ReturnType<typeof vi.fn>;
    };
  };

  beforeEach(async () => {
    prisma = {
      customer: {
        create: vi.fn(),
        update: vi.fn(),
        findMany: vi.fn(),
        findUnique: vi.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CustomersRepository,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    repo = module.get(CustomersRepository);
  });

  describe('create', () => {
    it('devuelve el cliente creado en el camino feliz', async () => {
      const created = buildCustomer();
      prisma.customer.create.mockResolvedValue(created);

      await expect(
        repo.create({
          name: created.name,
          taxId: created.taxId,
          email: created.email,
        }),
      ).resolves.toBe(created);
    });

    it('traduce el P2002 de tax_id (target como lista de campos) a ConflictException', async () => {
      prisma.customer.create.mockRejectedValue(p2002(['tax_id']));

      await expect(
        repo.create({
          name: 'X',
          taxId: '30-99999999-9',
          email: 'x@x.example',
        }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('traduce el P2002 de tax_id (target como nombre de índice) a ConflictException', async () => {
      prisma.customer.create.mockRejectedValue(p2002('customer_tax_id_key'));

      await expect(
        repo.create({
          name: 'X',
          taxId: '30-99999999-9',
          email: 'x@x.example',
        }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('incluye el taxId en el mensaje del 409', async () => {
      prisma.customer.create.mockRejectedValue(p2002(['tax_id']));

      await expect(
        repo.create({
          name: 'X',
          taxId: '30-99999999-9',
          email: 'x@x.example',
        }),
      ).rejects.toThrow('30-99999999-9');
    });

    it('propaga sin tocar cualquier otro error de Prisma', async () => {
      const other = new Prisma.PrismaClientKnownRequestError('boom', {
        code: 'P2003',
        clientVersion: 'test',
      });
      prisma.customer.create.mockRejectedValue(other);

      await expect(
        repo.create({ name: 'X', taxId: '30-1-1', email: 'x@x.example' }),
      ).rejects.toBe(other);
    });

    it('propaga sin tocar un error que no es de Prisma', async () => {
      const boom = new Error('connection reset');
      prisma.customer.create.mockRejectedValue(boom);

      await expect(
        repo.create({ name: 'X', taxId: '30-1-1', email: 'x@x.example' }),
      ).rejects.toBe(boom);
    });
  });

  describe('update', () => {
    it('traduce el P2002 de tax_id a ConflictException', async () => {
      prisma.customer.update.mockRejectedValue(p2002(['tax_id']));

      await expect(
        repo.update('11111111-1111-1111-1111-111111111111', {
          taxId: '30-88888888-8',
        }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('propaga el P2025 (registro inexistente) sin tocarlo', async () => {
      const notFound = new Prisma.PrismaClientKnownRequestError('not found', {
        code: 'P2025',
        clientVersion: 'test',
      });
      prisma.customer.update.mockRejectedValue(notFound);

      await expect(
        repo.update('missing', { name: 'Nuevo nombre' }),
      ).rejects.toBe(notFound);
    });
  });

  describe('findMany', () => {
    it('oculta los archivados por defecto', async () => {
      prisma.customer.findMany.mockResolvedValue([]);

      await repo.findMany();

      expect(prisma.customer.findMany).toHaveBeenCalledWith({
        where: { archivedAt: null },
        orderBy: { name: 'asc' },
      });
    });

    it('incluye los archivados cuando se pide', async () => {
      prisma.customer.findMany.mockResolvedValue([]);

      await repo.findMany({ includeArchived: true });

      expect(prisma.customer.findMany).toHaveBeenCalledWith({
        where: undefined,
        orderBy: { name: 'asc' },
      });
    });
  });
});
