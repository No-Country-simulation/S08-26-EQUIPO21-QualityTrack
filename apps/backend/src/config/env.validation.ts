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

  if (errors.length > 0 || databaseUrl === undefined) {
    throw new Error(
      `Configuración de entorno inválida:\n  - ${errors.join('\n  - ')}`,
    );
  }

  return {
    DATABASE_URL: databaseUrl,
    PORT: port,
    NODE_ENV: nodeEnv as EnvVars['NODE_ENV'],
  };
}
