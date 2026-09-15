import { Global, Module } from '@nestjs/common';
import { StorageService } from './storage.service';

/**
 * Módulo global: `StorageService` queda disponible para inyección en
 * cualquier módulo de feature sin reimportar `StorageModule` (mismo
 * patrón que `PrismaModule`, ver ADR-0005 y ADR-0010).
 *
 * El consumidor previsto es `dossier` (alta de `DOCUMENT`: metadatos en
 * Prisma + binario acá) — ADR-0010, issue #29.
 */
@Global()
@Module({
  providers: [StorageService],
  exports: [StorageService],
})
export class StorageModule {}
