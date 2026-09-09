import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { validate } from '../config/env.validation';
import { StorageService } from './storage.service';

/**
 * Prueba de integración del object storage (AC3 de la issue #5): sube un
 * archivo al MinIO local, genera una URL firmada, descarga por esa URL y
 * verifica que el contenido vuelve intacto. Después limpia el objeto.
 *
 * Necesita el MinIO de `compose.yml` levantado (`docker compose up -d`)
 * y el bucket creado por `minio-setup`. Misma dependencia de infra que
 * `test/health.e2e-spec.ts` con Postgres.
 *
 * No mockea nada: el punto de esta prueba es confirmar que la
 * configuración real (`.env` + `StorageService` + SDK) funciona
 * end-to-end contra un S3 de verdad.
 */
describe('StorageService (integración con MinIO)', () => {
  let storage: StorageService;
  const key = `test/storage-spec-${Date.now()}.txt`;
  const content = Buffer.from('QualityTrack storage smoke test\n', 'utf-8');

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true, validate })],
      providers: [StorageService],
    }).compile();

    // dispara onModuleInit -> HeadBucket, falla si MinIO no responde
    await module.init();
    storage = module.get(StorageService);
  });

  afterAll(async () => {
    await storage?.deleteObject(key).catch(() => undefined);
  });

  it('sube un archivo y lo recupera intacto por presigned URL', async () => {
    await storage.putObject(key, content, 'text/plain');

    const url = await storage.getSignedDownloadUrl(key, 60);
    expect(url).toMatch(/^https?:\/\//);
    expect(url).toContain(key);

    const res = await fetch(url);
    expect(res.status).toBe(200);

    const downloaded = Buffer.from(await res.arrayBuffer());
    expect(downloaded.equals(content)).toBe(true);
  });

  it('deleteObject quita el objeto (la descarga posterior falla)', async () => {
    await storage.putObject(key, content, 'text/plain');
    await storage.deleteObject(key);

    const url = await storage.getSignedDownloadUrl(key, 60);
    const res = await fetch(url);
    expect(res.status).toBe(404);
  });
});
