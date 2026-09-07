import { Controller, Get } from '@nestjs/common';
import {
  HealthCheck,
  HealthCheckService,
  HealthIndicatorService,
} from '@nestjs/terminus';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../../prisma/prisma.service';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly indicator: HealthIndicatorService,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  @HealthCheck()
  @ApiOperation({
    summary: 'Estado del servicio y de la conexión a PostgreSQL',
  })
  check() {
    return this.health.check([() => this.checkDatabase()]);
  }

  // `SELECT 1` contra Postgres. Si falla (base caída, credenciales,
  // red), el endpoint responde 503 -- lo que el healthcheck de Docker
  // y el load balancer del deploy esperan. Se usa manejo de error
  // propio en vez de `PrismaHealthIndicator.pingCheck` porque este
  // último, con el driver adapter de Prisma 7, deja el `message` vacío.
  private async checkDatabase() {
    const session = this.indicator.check('database');
    const start = Date.now();
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return session.up({ responseTime: Date.now() - start });
    } catch {
      return session.down({
        responseTime: Date.now() - start,
        message: 'No se puede conectar a PostgreSQL',
      });
    }
  }
}
