import { jest } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { CustomersService } from './customers.service';
import { CustomersRepository } from './customers.repository';
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

describe('CustomersService', () => {
  let service: CustomersService;
  let repo: jest.Mocked<CustomersRepository>;

  beforeEach(async () => {
    const repoMock: Partial<jest.Mocked<CustomersRepository>> = {
      create: jest.fn(),
      findMany: jest.fn(),
      findById: jest.fn(),
      findByTaxId: jest.fn(),
      update: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CustomersService,
        { provide: CustomersRepository, useValue: repoMock },
      ],
    }).compile();

    service = module.get(CustomersService);
    repo = module.get(CustomersRepository);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('crea el cliente cuando el taxId está libre y normaliza los opcionales a null', async () => {
      repo.findByTaxId.mockResolvedValue(null);
      const created = buildCustomer();
      repo.create.mockResolvedValue(created);

      const result = await service.create({
        name: 'Mecánica Sur SA',
        taxId: '30-12345678-9',
        email: 'compras@sur.example',
      });

      expect(result).toBe(created);
      expect(repo.create).toHaveBeenCalledWith({
        name: 'Mecánica Sur SA',
        taxId: '30-12345678-9',
        email: 'compras@sur.example',
        phone: null,
        address: null,
      });
    });

    it('pasa phone y address cuando vienen en el DTO', async () => {
      repo.findByTaxId.mockResolvedValue(null);
      repo.create.mockResolvedValue(buildCustomer());

      await service.create({
        name: 'Mecánica Sur SA',
        taxId: '30-12345678-9',
        email: 'compras@sur.example',
        phone: '+54 11 5555-5555',
        address: 'Av. Siempreviva 742',
      });

      expect(repo.create).toHaveBeenCalledWith({
        name: 'Mecánica Sur SA',
        taxId: '30-12345678-9',
        email: 'compras@sur.example',
        phone: '+54 11 5555-5555',
        address: 'Av. Siempreviva 742',
      });
    });

    it('rechaza con 409 si el taxId ya existe', async () => {
      repo.findByTaxId.mockResolvedValue(buildCustomer());

      await expect(
        service.create({
          name: 'Otra SA',
          taxId: '30-12345678-9',
          email: 'x@y.example',
        }),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(repo.create).not.toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('excluye archivados por defecto', async () => {
      repo.findMany.mockResolvedValue([]);
      await service.findAll();
      expect(repo.findMany).toHaveBeenCalledWith({ includeArchived: false });
    });

    it('incluye archivados cuando se pide', async () => {
      repo.findMany.mockResolvedValue([]);
      await service.findAll(true);
      expect(repo.findMany).toHaveBeenCalledWith({ includeArchived: true });
    });
  });

  describe('findOne', () => {
    it('devuelve el cliente si existe, aunque esté archivado', async () => {
      const customer = buildCustomer({ archivedAt: new Date() });
      repo.findById.mockResolvedValue(customer);

      await expect(service.findOne(customer.id)).resolves.toBe(customer);
    });

    it('lanza 404 si no existe', async () => {
      repo.findById.mockResolvedValue(null);

      await expect(service.findOne('missing')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('lanza 404 si el cliente no existe', async () => {
      repo.findById.mockResolvedValue(null);

      await expect(
        service.update('missing', { name: 'Nuevo nombre' }),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(repo.update).not.toHaveBeenCalled();
    });

    it('rechaza con 409 si el nuevo taxId pertenece a otro cliente', async () => {
      const current = buildCustomer({ id: 'a' });
      repo.findById.mockResolvedValue(current);
      repo.findByTaxId.mockResolvedValue(buildCustomer({ id: 'b' }));

      await expect(
        service.update('a', { taxId: '30-99999999-9' }),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(repo.update).not.toHaveBeenCalled();
    });

    it('permite reenviar el mismo taxId del propio cliente', async () => {
      const current = buildCustomer({ id: 'a', taxId: '30-12345678-9' });
      repo.findById.mockResolvedValue(current);
      repo.findByTaxId.mockResolvedValue(current);
      repo.update.mockResolvedValue(current);

      await expect(
        service.update('a', { taxId: '30-12345678-9', name: 'Sur SA' }),
      ).resolves.toBe(current);
      expect(repo.update).toHaveBeenCalledWith('a', {
        name: 'Sur SA',
        taxId: '30-12345678-9',
        email: undefined,
        phone: undefined,
        address: undefined,
      });
    });
  });

  describe('archive', () => {
    it('setea archivedAt en un cliente activo', async () => {
      const active = buildCustomer({ id: 'a', archivedAt: null });
      repo.findById.mockResolvedValue(active);
      const archived = buildCustomer({ id: 'a', archivedAt: new Date() });
      repo.update.mockResolvedValue(archived);

      const result = await service.archive('a');

      expect(result).toBe(archived);
      expect(repo.update).toHaveBeenCalledWith('a', {
        archivedAt: expect.any(Date),
      });
    });

    it('es idempotente: no toca un cliente ya archivado', async () => {
      const already = buildCustomer({ id: 'a', archivedAt: new Date() });
      repo.findById.mockResolvedValue(already);

      const result = await service.archive('a');

      expect(result).toBe(already);
      expect(repo.update).not.toHaveBeenCalled();
    });

    it('lanza 404 si el cliente no existe', async () => {
      repo.findById.mockResolvedValue(null);
      await expect(service.archive('missing')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('unarchive', () => {
    it('limpia archivedAt en un cliente archivado', async () => {
      const archived = buildCustomer({ id: 'a', archivedAt: new Date() });
      repo.findById.mockResolvedValue(archived);
      const active = buildCustomer({ id: 'a', archivedAt: null });
      repo.update.mockResolvedValue(active);

      const result = await service.unarchive('a');

      expect(result).toBe(active);
      expect(repo.update).toHaveBeenCalledWith('a', { archivedAt: null });
    });

    it('es idempotente: no toca un cliente ya activo', async () => {
      const active = buildCustomer({ id: 'a', archivedAt: null });
      repo.findById.mockResolvedValue(active);

      const result = await service.unarchive('a');

      expect(result).toBe(active);
      expect(repo.update).not.toHaveBeenCalled();
    });
  });
});
