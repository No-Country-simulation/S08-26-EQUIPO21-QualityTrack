import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const config = new DocumentBuilder()
    .setTitle('QualityTrack API')
    .setDescription('Gestión y trazabilidad de Órdenes de Trabajo')
    .setVersion('0.1.0')
    .addBearerAuth() // para el JWT del módulo users (ADR-0005)
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document, {
    jsonDocumentUrl: 'docs/json', // OpenAPI JSON crudo en /docs/json
  });

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
