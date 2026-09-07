import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

/**
 * Módulo global: `PrismaService` queda disponible para inyección en
 * cualquier módulo de feature sin necesidad de importar `PrismaModule`
 * ni volver a declarar el provider (ver ADR-0004, action item 3).
 */
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
