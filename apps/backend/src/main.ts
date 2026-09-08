import { RequestMethod, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { EnvVars } from './config/env.validation';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Cierra el pool de Prisma (onModuleDestroy) al recibir SIGTERM/SIGINT,
  // p. ej. en `docker stop` o al frenar los tests (ver ADR-0004).
  app.enableShutdownHooks();

  // Validación de DTOs con class-validator en toda la API:
  //  - whitelist: descarta propiedades del body sin decorador de validación.
  //  - forbidNonWhitelisted: además, rechaza el request si trae alguna.
  //  - transform: instancia el DTO como clase y castea tipos primitivos
  //    (p. ej. params de query string a number) según los tipos declarados.
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // Toda la API cuelga de /api/v1, salvo /health: los orquestadores
  // (Docker healthcheck, load balancer) lo esperan en una ruta fija que
  // no cambia entre versiones de la API.
  app.setGlobalPrefix('api/v1', {
    exclude: [{ path: 'health', method: RequestMethod.GET }],
  });

  const config = new DocumentBuilder()
    .setTitle('QualityTrack API')
    .setDescription('Gestión y trazabilidad de Órdenes de Trabajo')
    .setVersion('0.1.0')
    .addBearerAuth() // para el JWT del módulo users (ADR-0005)
    .addServer('/api/v1') // relativo: se resuelve contra el origin que sirve la doc
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document, {
    jsonDocumentUrl: 'docs/json', // OpenAPI JSON crudo en /docs/json
  });

  const configService = app.get(ConfigService<EnvVars, true>);
  await app.listen(configService.get('PORT', { infer: true }));
}
bootstrap();
