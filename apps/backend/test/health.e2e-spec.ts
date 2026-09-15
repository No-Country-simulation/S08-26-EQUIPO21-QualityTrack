import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from '../src/app.module';

/**
 * Smoke test end-to-end: levanta el AppModule completo y verifica que
 * el endpoint de health responde. Necesita un PostgreSQL real corriendo
 * (el `compose.yml` de desarrollo) -- `GET /health` hace un `SELECT 1`.
 *
 * Reemplaza al spec de ejemplo de `nest new` (que probaba un
 * `GET / -> "Hello World"` inexistente en este proyecto). El e2e de
 * verdad del sistema es el del expediente único (dossier, ADR-0005),
 * que se agrega cuando ese módulo exista.
 */
describe('Health (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /health -> 200 y estado ok', async () => {
    const res = await request(app.getHttpServer()).get('/health').expect(200);

    expect(res.body.status).toBe('ok');
    expect(res.body.info.database.status).toBe('up');
  });
});
