import { Test, TestingModule } from '@nestjs/testing';
import { RequestsController } from './requests.controller';
import { RequestsService } from './requests.service';

describe('RequestsController', () => {
  let controller: RequestsController;
  const service = {
    create: vi.fn(),
    findAll: vi.fn(),
    findOne: vi.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RequestsController],
      providers: [{ provide: RequestsService, useValue: service }],
    }).compile();

    controller = module.get(RequestsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('delega create en el service', () => {
    const dto = {
      customerId: '11111111-1111-1111-1111-111111111111',
      description: 'Torneado de ejes',
    };
    controller.create(dto);
    expect(service.create).toHaveBeenCalledWith(dto);
  });

  it('findAll pasa pendingQuote=false por defecto', () => {
    controller.findAll();
    expect(service.findAll).toHaveBeenCalledWith(false);
  });

  it('findAll propaga pendingQuote=true', () => {
    controller.findAll(true);
    expect(service.findAll).toHaveBeenCalledWith(true);
  });

  it('delega findOne en el service con el id', () => {
    controller.findOne('22222222-2222-2222-2222-222222222222');
    expect(service.findOne).toHaveBeenCalledWith(
      '22222222-2222-2222-2222-222222222222',
    );
  });
});
