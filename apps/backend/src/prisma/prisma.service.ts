import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';
import { EnvVars } from '../config/env.validation';

/**
 * Acceso a la base de datos vía Prisma. Único punto de conexión al pool
 * de PostgreSQL (ver ADR-0004). Se expone como módulo global en
 * `PrismaModule` para que cualquier módulo de feature lo inyecte sin
 * volver a declararlo.
 *
 * `DATABASE_URL` ya viene cargada y validada por `ConfigModule`
 * (ver `src/config/env.validation.ts`), que corre antes que el DI
 * instancie este provider.
 */
@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  constructor(config: ConfigService<EnvVars, true>) {
    const adapter = new PrismaPg({
      connectionString: config.get('DATABASE_URL', { infer: true }),
    });
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
