import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { HealthController } from './health.controller';

// Health check del servicio. Vive bajo src/modules/ como el resto
// (ADR-0005), pero no es un módulo de negocio: solo expone GET /health
// para orquestadores (Docker healthcheck, load balancer del deploy).
// La ruta queda fuera del prefijo api/v1 -- ver src/main.ts.
@Module({
  imports: [TerminusModule],
  controllers: [HealthController],
})
export class HealthModule {}
