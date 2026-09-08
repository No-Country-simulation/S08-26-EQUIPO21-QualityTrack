import { jest } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { CustomersController } from './customers.controller';
import { CustomersService } from './customers.service';

describe('CustomersController', () => {
  let controller: CustomersController;
  const service = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    archive: jest.fn(),
    unarchive: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CustomersController],
      providers: [{ provide: CustomersService, useValue: service }],
    }).compile();

    controller = module.get(CustomersController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('delega create en el service', () => {
    const dto = {
      name: 'Sur SA',
      taxId: '30-12345678-9',
      email: 'compras@sur.example',
    };
    controller.create(dto);
    expect(service.create).toHaveBeenCalledWith(dto);
  });

  it('findAll pasa includeArchived=false por defecto', () => {
    controller.findAll();
    expect(service.findAll).toHaveBeenCalledWith(false);
  });

  it('findAll propaga includeArchived=true', () => {
    controller.findAll(true);
    expect(service.findAll).toHaveBeenCalledWith(true);
  });

  it('delega update en el service con id y dto', () => {
    controller.update('11111111-1111-1111-1111-111111111111', {
      name: 'Nuevo',
    });
    expect(service.update).toHaveBeenCalledWith(
      '11111111-1111-1111-1111-111111111111',
      { name: 'Nuevo' },
    );
  });

  it('delega archive y unarchive en el service', () => {
    controller.archive('11111111-1111-1111-1111-111111111111');
    expect(service.archive).toHaveBeenCalledWith(
      '11111111-1111-1111-1111-111111111111',
    );
    controller.unarchive('11111111-1111-1111-1111-111111111111');
    expect(service.unarchive).toHaveBeenCalledWith(
      '11111111-1111-1111-1111-111111111111',
    );
  });
});
