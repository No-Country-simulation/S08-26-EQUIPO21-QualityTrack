import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import type { Mocked } from 'vitest';
import { RequestsService } from './requests.service';
import { RequestsRepository } from './requests.repository';
import { CustomersRepository } from './customers.repository';
import type { Customer, Request } from '../../generated/prisma/client';

const CUSTOMER_ID = '11111111-1111-1111-1111-111111111111';
const REQUEST_ID = '22222222-2222-2222-2222-222222222222';

const buildCustomer = (over: Partial<Customer> = {}): Customer => ({
  id: CUSTOMER_ID,
  name: 'Mecánica Sur SA',
  taxId: '30-12345678-9',
  email: 'compras@sur.example',
  phone: null,
  address: null,
  archivedAt: null,
  ...over,
});

const buildRequest = (over: Partial<Request> = {}): Request => ({
  id: REQUEST_ID,
  customerId: CUSTOMER_ID,
  description: 'Torneado de 20 ejes de acero',
  createdAt: new Date('2026-09-08T10:00:00Z'),
  ...over,
});

describe('RequestsService', () => {
  let service: RequestsService;
  let requests: Mocked<RequestsRepository>;
  let customers: Mocked<CustomersRepository>;

  beforeEach(async () => {
    const requestsMock: Partial<Mocked<RequestsRepository>> = {
      create: vi.fn(),
      findMany: vi.fn(),
      findByIdWithCustomer: vi.fn(),
    };
    const customersMock: Partial<Mocked<CustomersRepository>> = {
      findById: vi.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RequestsService,
        { provide: RequestsRepository, useValue: requestsMock },
        { provide: CustomersRepository, useValue: customersMock },
      ],
    }).compile();

    service = module.get(RequestsService);
    requests = module.get(RequestsRepository);
    customers = module.get(CustomersRepository);
  });

  describe('create (AC2)', () => {
    it('crea la solicitud cuando el cliente existe y está activo', async () => {
      customers.findById.mockResolvedValue(buildCustomer());
      const created = buildRequest();
      requests.create.mockResolvedValue(created);

      const result = await service.create({
        customerId: CUSTOMER_ID,
        description: 'Torneado de 20 ejes de acero',
      });

      expect(result).toBe(created);
      expect(requests.create).toHaveBeenCalledWith({
        customerId: CUSTOMER_ID,
        description: 'Torneado de 20 ejes de acero',
      });
    });

    it('rechaza con 404 si el cliente no existe', async () => {
      customers.findById.mockResolvedValue(null);

      await expect(
        service.create({ customerId: CUSTOMER_ID, description: 'x' }),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(requests.create).not.toHaveBeenCalled();
    });

    it('rechaza con 409 si el cliente está archivado (guard ADR-0007)', async () => {
      customers.findById.mockResolvedValue(
        buildCustomer({ archivedAt: new Date('2026-01-01T00:00:00Z') }),
      );

      await expect(
        service.create({ customerId: CUSTOMER_ID, description: 'x' }),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(requests.create).not.toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('pasa pendingQuote=false por defecto', async () => {
      requests.findMany.mockResolvedValue([]);
      await service.findAll();
      expect(requests.findMany).toHaveBeenCalledWith({ pendingQuote: false });
    });

    it('propaga pendingQuote=true', async () => {
      requests.findMany.mockResolvedValue([]);
      await service.findAll(true);
      expect(requests.findMany).toHaveBeenCalledWith({ pendingQuote: true });
    });
  });

  describe('findOne (AC3)', () => {
    it('devuelve la solicitud con el cliente asociado', async () => {
      const withCustomer = { ...buildRequest(), customer: buildCustomer() };
      requests.findByIdWithCustomer.mockResolvedValue(withCustomer);

      const result = await service.findOne(REQUEST_ID);

      expect(result).toBe(withCustomer);
      expect(result.customer.id).toBe(CUSTOMER_ID);
    });

    it('rechaza con 404 si la solicitud no existe', async () => {
      requests.findByIdWithCustomer.mockResolvedValue(null);

      await expect(service.findOne(REQUEST_ID)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });
});
