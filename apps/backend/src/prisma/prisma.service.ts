import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';

/**
 * Acceso a la base de datos vía Prisma. Único punto de conexión al pool
 * de PostgreSQL (ver ADR-0004). Se expone como módulo global en
 * `PrismaModule` para que cualquier módulo de feature lo inyecte sin
 * volver a declararlo.
 */
@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error(
        `DATABASE_URL no está definida. Copia apps/backend/.env.example a 
        .env y ajustá la cadena de conexión (ver apps/backend/README.md).`,
      );
    }

    const adapter = new PrismaPg({ connectionString });
    super({ adapter });
  }

  async onModuleInit() {
    await this.$connect();
    this.logger.log('Conexión a PostgreSQL establecida');
  }

  async onModuleDestroy() {
    await this.$disconnect();
    this.logger.log('Conexión a PostgreSQL cerrada');
  }
}
