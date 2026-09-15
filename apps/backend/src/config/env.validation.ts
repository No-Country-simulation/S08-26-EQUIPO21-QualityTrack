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
  CORS_ORIGIN: string; // Origen exacto del frontend
}

function requireNonEmpty(
  errors: string[],
  key: string,
  value: string | undefined,
  hint: string,
): value is string {
  if (value === undefined || value.length === 0) {
    errors.push(`${key} falta o está vacía. ${hint}`);
    return false;
  }
  return true;
}

function requireHttpUrl(errors: string[], key: string, value: string): void {
  if (!/^https?:\/\//.test(value)) {
    errors.push(
      `${key} debe empezar con http:// o https:// (recibido: "${value}").`,
    );
  }
}

// A diferencia de requireHttpUrl, exige un origin exacto (sin path,
// query ni trailing slash): CORS_ORIGIN se compara literal contra el
// header Origin del navegador (ver app.enableCors en main.ts), que
// nunca lleva esos extras.
function requireOrigin(errors: string[], key: string, value: string): void {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    errors.push(`${key} no es una URL válida (recibido: "${value}").`);
    return;
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    errors.push(
      `${key} debe empezar con http:// o https:// (recibido: "${value}").`,
    );
    return;
  }
  if (url.origin !== value) {
    errors.push(
      `${key} debe ser un origin exacto (sin path ni trailing slash), p. ej. "https://example.com" (recibido: "${value}").`,
    );
  }
}

export function validate(
  // process.env / dotenv siempre entrega strings (o undefined); nunca
  // objetos ni números. Tiparlo así evita falsos positivos de
  // "stringification" y refleja la realidad de la fuente.
  config: Record<string, string | undefined>,
): EnvVars {
  const errors: string[] = [];

  const databaseUrl = config.DATABASE_URL;
  if (
    requireNonEmpty(
      errors,
      'DATABASE_URL',
      databaseUrl,
      'Copiá apps/backend/.env.example a apps/backend/.env (ver apps/backend/README.md).',
    ) &&
    !/^postgres(ql)?:\/\//.test(databaseUrl)
  ) {
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
    if (
      requireNonEmpty(
        errors,
        key,
        value,
        'Copiá apps/backend/.env.example a apps/backend/.env (ver ADR-0010 y apps/backend/README.md).',
      )
    ) {
      storage[key] = value;
    }
  }

  if (storage.STORAGE_ENDPOINT !== undefined) {
    requireHttpUrl(errors, 'STORAGE_ENDPOINT', storage.STORAGE_ENDPOINT);
  }

  // Opcional: default false. Solo 'true' (case-insensitive) lo activa —
  // necesario para MinIO, innecesario para Railway Buckets.
  const forcePathStyle =
    (config.STORAGE_FORCE_PATH_STYLE ?? 'false').toLowerCase() === 'true';

  const corsOrigin = config.CORS_ORIGIN;
  if (
    requireNonEmpty(
      errors,
      'CORS_ORIGIN',
      corsOrigin,
      'Copiá apps/backend/.env.example a apps/backend/.env',
    )
  ) {
    requireOrigin(errors, 'CORS_ORIGIN', corsOrigin);
  }

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
    CORS_ORIGIN: corsOrigin as string,
  };
}
