import { Test, TestingModule } from '@nestjs/testing';
import { OperationsController } from './operations.controller';
import { OperationsService } from './operations.service';

const OPERATION_ID = '66666666-6666-6666-6666-666666666666';
const USER_ID = '44444444-4444-4444-4444-444444444444';

describe('OperationsController', () => {
  let controller: OperationsController;
  const service = {
    start: vi.fn(),
    finish: vi.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OperationsController],
      providers: [{ provide: OperationsService, useValue: service }],
    }).compile();

    controller = module.get(OperationsController);
  });

  it('delega start en el service con el id y el userId', () => {
    controller.start(OPERATION_ID, { userId: USER_ID });
    expect(service.start).toHaveBeenCalledWith(OPERATION_ID, USER_ID);
  });

  it('delega finish en el service con el id y el userId', () => {
    controller.finish(OPERATION_ID, { userId: USER_ID });
    expect(service.finish).toHaveBeenCalledWith(OPERATION_ID, USER_ID);
  });
});
