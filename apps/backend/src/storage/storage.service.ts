import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { EnvVars } from '../config/env.validation';

/**
 * Acceso al object storage S3-compatible (ver ADR-0010). Wrapper delgado
 * sobre `@aws-sdk/client-s3`: sin lógica de negocio, igual que
 * `PrismaService`. Se expone como módulo global en `StorageModule`.
 *
 * El código es idéntico en dev y prod: en dev el cliente apunta al MinIO
 * de `compose.yml` (`STORAGE_FORCE_PATH_STYLE=true`), en prod al Railway
 * Storage Bucket. Solo cambian las variables `STORAGE_*` del entorno, ya
 * validadas por `ConfigModule` (`src/config/env.validation.ts`).
 *
 * En `DOCUMENT.url` se guarda la **object key** (ej.
 * `work-orders/<id>/<uuid>-plano.pdf`), no una URL firmada: las
 * presigned URLs expiran y se generan on-demand al descargar.
 */
@Injectable()
export class StorageService implements OnModuleInit {
  private readonly logger = new Logger(StorageService.name);
  private readonly client: S3Client;
  private readonly bucket: string;

  constructor(config: ConfigService<EnvVars, true>) {
    this.bucket = config.get('STORAGE_BUCKET', { infer: true });
    this.client = new S3Client({
      endpoint: config.get('STORAGE_ENDPOINT', { infer: true }),
      region: config.get('STORAGE_REGION', { infer: true }),
      credentials: {
        accessKeyId: config.get('STORAGE_ACCESS_KEY_ID', { infer: true }),
        secretAccessKey: config.get('STORAGE_SECRET_ACCESS_KEY', {
          infer: true,
        }),
      },
      // MinIO necesita path-style (bucket en la ruta); Railway Buckets
      // funciona con virtual-hosted style.
      forcePathStyle: config.get('STORAGE_FORCE_PATH_STYLE', { infer: true }),
    });
  }

  /**
   * Verifica al arrancar que el bucket existe y es accesible con las
   * credenciales dadas — fail-fast, mismo criterio que `PrismaService`
   * con `$connect()`. Un `STORAGE_*` mal puesto se detecta acá y no al
   * primer upload.
   */
  async onModuleInit() {
    try {
      await this.client.send(new HeadBucketCommand({ Bucket: this.bucket }));
      this.logger.log(`Object storage accesible (bucket "${this.bucket}")`);
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      throw new Error(
        `No se pudo acceder al bucket "${this.bucket}" en el object ` +
          `storage. Revisá que MinIO esté levantado (docker compose up -d) ` +
          `y las variables STORAGE_* del .env. Detalle: ${detail}`,
      );
    }
  }

  /** Sube un objeto. `key` es la ruta dentro del bucket. */
  async putObject(
    key: string,
    body: Buffer,
    contentType: string,
  ): Promise<void> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
      }),
    );
  }

  /**
   * Genera una URL firmada de descarga para `key`, válida por
   * `expiresInSeconds` (default 5 min). Se llama on-demand al descargar
   * un documento, nunca se persiste.
   */
  getSignedDownloadUrl(key: string, expiresInSeconds = 300): Promise<string> {
    return getSignedUrl(
      this.client,
      new GetObjectCommand({ Bucket: this.bucket, Key: key }),
      { expiresIn: expiresInSeconds },
    );
  }

  /**
   * Borra un objeto. Reservado: en este dominio nada se borra (ADR-0007),
   * el CRUD de documentos no lo expone en el MVP. Existe para
   * completar la interfaz y para limpieza en tests.
   */
  async deleteObject(key: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({ Bucket: this.bucket, Key: key }),
    );
  }
}
