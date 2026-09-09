/**
 * Validación de las variables de entorno al arrancar. `@nestjs/config`
 * llama a `validate()` con el objeto crudo de `process.env` (más lo que
 * cargó del `.env`) y aborta el bootstrap si tira. Fail-fast, sin
 * dependencias extra: una `DATABASE_URL` mal escrita se detecta acá y no
 * como un error opaco del driver más adelante.
 */
export interface EnvVars {
  DATABASE_URL: string;
  PORT: number;
  NODE_ENV: 'development' | 'test' | 'production';
  // Object storage S3-compatible (ver ADR-0010). En dev apuntan al MinIO
  // de compose.yml; en prod, al Railway Storage Bucket.
  STORAGE_ENDPOINT: string;
  STORAGE_REGION: string;
  STORAGE_BUCKET: string;
  STORAGE_ACCESS_KEY_ID: string;
  STORAGE_SECRET_ACCESS_KEY: string;
  STORAGE_FORCE_PATH_STYLE: boolean;
}

export function validate(
  // process.env / dotenv siempre entrega strings (o undefined); nunca
  // objetos ni números. Tiparlo así evita falsos positivos de
  // "stringification" y refleja la realidad de la fuente.
  config: Record<string, string | undefined>,
): EnvVars {
  const errors: string[] = [];

  const databaseUrl = config.DATABASE_URL;
  if (databaseUrl === undefined || databaseUrl.length === 0) {
    errors.push(
      'DATABASE_URL falta o está vacía. Copiá apps/backend/.env.example a ' +
        'apps/backend/.env (ver apps/backend/README.md).',
    );
  } else if (!/^postgres(ql)?:\/\//.test(databaseUrl)) {
    errors.push(
      `DATABASE_URL no parece una cadena de PostgreSQL válida: "${databaseUrl}". ` +
        'Debe empezar con postgresql://',
    );
  }

  let port = 3000;
  if (config.PORT !== undefined) {
    port = Number(config.PORT);
    if (!Number.isInteger(port) || port <= 0 || port > 65535) {
      errors.push(`PORT no es un puerto válido: "${config.PORT}".`);
    }
  }

  const nodeEnv = config.NODE_ENV ?? 'development';
  if (!['development', 'test', 'production'].includes(nodeEnv)) {
    errors.push(
      `NODE_ENV debe ser development, test o production (recibido: "${nodeEnv}").`,
    );
  }

  // Object storage: las cinco son obligatorias (ADR-0010). Sin ellas, el
  // alta de documentos falla recién al primer upload, no al arrancar.
  const storage: Record<string, string> = {};
  for (const key of [
    'STORAGE_ENDPOINT',
    'STORAGE_REGION',
    'STORAGE_BUCKET',
    'STORAGE_ACCESS_KEY_ID',
    'STORAGE_SECRET_ACCESS_KEY',
  ] as const) {
    const value = config[key];
    if (value === undefined || value.length === 0) {
      errors.push(
        `${key} falta o está vacía. Copiá apps/backend/.env.example a ` +
          'apps/backend/.env (ver ADR-0010 y apps/backend/README.md).',
      );
    } else {
      storage[key] = value;
    }
  }

  if (
    config.STORAGE_ENDPOINT !== undefined &&
    config.STORAGE_ENDPOINT.length > 0
  ) {
    if (!/^https?:\/\//.test(config.STORAGE_ENDPOINT)) {
      errors.push(
        `STORAGE_ENDPOINT debe empezar con http:// o https:// ` +
          `(recibido: "${config.STORAGE_ENDPOINT}").`,
      );
    }
  }

  // Opcional: default false. Solo 'true' (case-insensitive) lo activa —
  // necesario para MinIO, innecesario para Railway Buckets.
  const forcePathStyle =
    (config.STORAGE_FORCE_PATH_STYLE ?? 'false').toLowerCase() === 'true';

  if (errors.length > 0 || databaseUrl === undefined) {
    throw new Error(
      `Configuración de entorno inválida:\n  - ${errors.join('\n  - ')}`,
    );
  }

  return {
    DATABASE_URL: databaseUrl,
    PORT: port,
    NODE_ENV: nodeEnv as EnvVars['NODE_ENV'],
    STORAGE_ENDPOINT: storage.STORAGE_ENDPOINT,
    STORAGE_REGION: storage.STORAGE_REGION,
    STORAGE_BUCKET: storage.STORAGE_BUCKET,
    STORAGE_ACCESS_KEY_ID: storage.STORAGE_ACCESS_KEY_ID,
    STORAGE_SECRET_ACCESS_KEY: storage.STORAGE_SECRET_ACCESS_KEY,
    STORAGE_FORCE_PATH_STYLE: forcePathStyle,
  };
}
