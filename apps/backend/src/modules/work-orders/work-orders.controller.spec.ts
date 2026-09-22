import { Test, TestingModule } from '@nestjs/testing';
import { WorkOrdersController } from './work-orders.controller';
import { WorkOrdersService } from './work-orders.service';
import type { CreateRouteSheetDto } from './dto/create-route-sheet.dto';
import { WorkOrderStatus } from '../../generated/prisma/client';

const WO_ID = '33333333-3333-3333-3333-333333333333';
const USER_ID = '44444444-4444-4444-4444-444444444444';

describe('WorkOrdersController', () => {
  let controller: WorkOrdersController;
  const service = {
    findAll: vi.fn(),
    findOne: vi.fn(),
    createRouteSheet: vi.fn(),
    getRouteSheet: vi.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [WorkOrdersController],
      providers: [{ provide: WorkOrdersService, useValue: service }],
    }).compile();

    controller = module.get(WorkOrdersController);
  });

  it('delega findOne en el service con el id', () => {
    controller.findOne(WO_ID);
    expect(service.findOne).toHaveBeenCalledWith(WO_ID);
  });

  it('delega createRouteSheet en el service con los tipos de operación en orden', () => {
    const dto: CreateRouteSheetDto = {
      operations: [{ type: 'Torneado' }, { type: 'Fresado' }],
      userId: USER_ID,
    };

    controller.createRouteSheet(WO_ID, dto);

    expect(service.createRouteSheet).toHaveBeenCalledWith(
      WO_ID,
      ['Torneado', 'Fresado'],
      USER_ID,
    );
  });

  it('delega getRouteSheet en el service con el id', () => {
    controller.getRouteSheet(WO_ID);
    expect(service.getRouteSheet).toHaveBeenCalledWith(WO_ID);
  });

  it('delega findAll en el service sin filtro', () => {
    controller.findAll();
    expect(service.findAll).toHaveBeenCalledWith(undefined);
  });

  it('delega findAll en el service con el status', () => {
    controller.findAll(WorkOrderStatus.routed);
    expect(service.findAll).toHaveBeenCalledWith(WorkOrderStatus.routed);
  });
});
