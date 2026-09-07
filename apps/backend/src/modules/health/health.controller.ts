import { Controller, Get } from '@nestjs/common';
import {
  HealthCheck,
  HealthCheckService,
  PrismaHealthIndicator,
} from '@nestjs/terminus';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../../prisma/prisma.service';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly prismaIndicator: PrismaHealthIndicator,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  @HealthCheck()
  @ApiOperation({
    summary: 'Estado del servicio y de la conexión a PostgreSQL',
  })
  check() {
    return this.health.check([
      // `SELECT 1` contra Postgres, con timeout de 1.5 s. Si falla,
      // el endpoint responde 503 -- lo que el healthcheck de Docker
      // y el load balancer del deploy esperan.
      () =>
        this.prismaIndicator
          .pingCheck('database', this.prisma)
          .withTimeout(1500),
    ]);
  }
}
