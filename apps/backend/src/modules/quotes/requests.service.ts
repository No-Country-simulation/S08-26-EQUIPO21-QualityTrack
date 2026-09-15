import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CustomersRepository } from './customers.repository';
import { RequestsRepository } from './requests.repository';
import { CreateRequestDto } from './dto/create-request.dto';
import type { Prisma, Request } from '../../generated/prisma/client';

type RequestWithCustomer = Prisma.RequestGetPayload<{
  include: { customer: true };
}>;

/**
 * Alta y consulta de solicitudes (`REQUEST`), área Comercial. Una
 * solicitud es el pedido original del cliente, previo a la cotización
 * (ADR-0003).
 *
 * Reglas (Épica 1 de docs/acceptance-criteria.md):
 *  - AC2: no se crea una solicitud sin un cliente existente. Además, si
 *    el cliente está archivado se rechaza (ADR-0007: un cliente
 *    archivado no genera trabajo nuevo).
 *  - AC3: el detalle incluye los datos del cliente asociado.
 */
@Injectable()
export class RequestsService {
  constructor(
    private readonly requests: RequestsRepository,
    private readonly customers: CustomersRepository,
  ) {}

  async create(dto: CreateRequestDto): Promise<Request> {
    const customer = await this.customers.findById(dto.customerId);
    if (customer === null) {
      throw new NotFoundException(
        `No existe un cliente con id "${dto.customerId}".`,
      );
    }
    if (customer.archivedAt !== null) {
      throw new ConflictException(
        `El cliente "${customer.name}" está archivado y no acepta ` +
          'solicitudes nuevas (ADR-0007). Reactivarlo antes de continuar.',
      );
    }

    return this.requests.create({
      customerId: dto.customerId,
      description: dto.description,
    });
  }

  findAll(pendingQuote = false): Promise<Request[]> {
    return this.requests.findMany({ pendingQuote });
  }

  /**
   * Detalle de la solicitud con su cliente (AC3). 404 si el id no
   * existe.
   */
  async findOne(id: string): Promise<RequestWithCustomer> {
    const request = await this.requests.findByIdWithCustomer(id);
    if (request === null) {
      throw new NotFoundException(`No existe una solicitud con id "${id}".`);
    }
    return request;
  }
}
