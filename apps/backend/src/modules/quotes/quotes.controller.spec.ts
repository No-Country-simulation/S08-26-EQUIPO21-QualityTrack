import { Test, TestingModule } from '@nestjs/testing';
import { QuotesController } from './quotes.controller';
import { QuotesService } from './quotes.service';

const QUOTE_ID = '11111111-1111-1111-1111-111111111111';

describe('QuotesController', () => {
  let controller: QuotesController;
  const service = {
    create: vi.fn(),
    findOne: vi.fn(),
    approve: vi.fn(),
    reject: vi.fn(),
    commercialPanel: vi.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [QuotesController],
      providers: [{ provide: QuotesService, useValue: service }],
    }).compile();

    controller = module.get(QuotesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('delega create en el service', () => {
    const dto = { requestId: QUOTE_ID, amount: 15000.5 };
    controller.create(dto);
    expect(service.create).toHaveBeenCalledWith(dto);
  });

  it('delega commercialPanel en el service', () => {
    controller.commercialPanel();
    expect(service.commercialPanel).toHaveBeenCalledWith();
  });

  it('delega findOne en el service con el id', () => {
    controller.findOne(QUOTE_ID);
    expect(service.findOne).toHaveBeenCalledWith(QUOTE_ID);
  });

  it('delega approve en el service con el id', () => {
    controller.approve(QUOTE_ID);
    expect(service.approve).toHaveBeenCalledWith(QUOTE_ID);
  });

  it('delega reject en el service con el id', () => {
    controller.reject(QUOTE_ID);
    expect(service.reject).toHaveBeenCalledWith(QUOTE_ID);
  });
});
