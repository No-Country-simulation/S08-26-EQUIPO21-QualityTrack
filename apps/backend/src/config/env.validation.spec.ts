import { validate } from './env.validation';

const validConfig: Record<string, string> = {
  DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
  PORT: '3000',
  NODE_ENV: 'development',
  STORAGE_ENDPOINT: 'http://localhost:9100',
  STORAGE_REGION: 'us-east-1',
  STORAGE_BUCKET: 'qualitytrack',
  STORAGE_ACCESS_KEY_ID: 'minio',
  STORAGE_SECRET_ACCESS_KEY: 'minio12345',
  STORAGE_FORCE_PATH_STYLE: 'true',
  CORS_ORIGIN: 'http://localhost:5173',
};

describe('validate', () => {
  it('returns the parsed env vars when the config is valid', () => {
    expect(validate(validConfig)).toEqual({
      DATABASE_URL: validConfig.DATABASE_URL,
      PORT: 3000,
      NODE_ENV: 'development',
      STORAGE_ENDPOINT: validConfig.STORAGE_ENDPOINT,
      STORAGE_REGION: validConfig.STORAGE_REGION,
      STORAGE_BUCKET: validConfig.STORAGE_BUCKET,
      STORAGE_ACCESS_KEY_ID: validConfig.STORAGE_ACCESS_KEY_ID,
      STORAGE_SECRET_ACCESS_KEY: validConfig.STORAGE_SECRET_ACCESS_KEY,
      STORAGE_FORCE_PATH_STYLE: true,
      CORS_ORIGIN: validConfig.CORS_ORIGIN,
    });
  });

  it('defaults PORT to 3000, NODE_ENV to development and STORAGE_FORCE_PATH_STYLE to false when omitted', () => {
    const {
      PORT: _PORT,
      NODE_ENV: _NODE_ENV,
      STORAGE_FORCE_PATH_STYLE: _STORAGE_FORCE_PATH_STYLE,
      ...rest
    } = validConfig;

    const result = validate(rest);

    expect(result.PORT).toBe(3000);
    expect(result.NODE_ENV).toBe('development');
    expect(result.STORAGE_FORCE_PATH_STYLE).toBe(false);
  });

  it('accepts STORAGE_FORCE_PATH_STYLE case-insensitively', () => {
    expect(
      validate({ ...validConfig, STORAGE_FORCE_PATH_STYLE: 'TRUE' })
        .STORAGE_FORCE_PATH_STYLE,
    ).toBe(true);
  });

  it('throws when DATABASE_URL is missing', () => {
    const { DATABASE_URL: _DATABASE_URL, ...rest } = validConfig;

    expect(() => validate(rest)).toThrow(/DATABASE_URL falta o está vacía/);
  });

  it('throws when DATABASE_URL does not start with postgresql://', () => {
    expect(() =>
      validate({ ...validConfig, DATABASE_URL: 'mysql://localhost/db' }),
    ).toThrow(/no parece una cadena de PostgreSQL válida/);
  });

  it('throws when PORT is not a valid port number', () => {
    expect(() => validate({ ...validConfig, PORT: 'not-a-port' })).toThrow(
      /PORT no es un puerto válido/,
    );
    expect(() => validate({ ...validConfig, PORT: '0' })).toThrow(
      /PORT no es un puerto válido/,
    );
    expect(() => validate({ ...validConfig, PORT: '70000' })).toThrow(
      /PORT no es un puerto válido/,
    );
  });

  it('throws when NODE_ENV is not one of the allowed values', () => {
    expect(() => validate({ ...validConfig, NODE_ENV: 'staging' })).toThrow(
      /NODE_ENV debe ser development, test o production/,
    );
  });

  it('throws when a STORAGE_* variable is missing', () => {
    const { STORAGE_BUCKET: _STORAGE_BUCKET, ...rest } = validConfig;

    expect(() => validate(rest)).toThrow(/STORAGE_BUCKET falta o está vacía/);
  });

  it('throws when STORAGE_ENDPOINT has no protocol', () => {
    expect(() =>
      validate({ ...validConfig, STORAGE_ENDPOINT: 'localhost:9100' }),
    ).toThrow(/STORAGE_ENDPOINT debe empezar con http:\/\/ o https:\/\//);
  });

  it('throws when CORS_ORIGIN is missing', () => {
    const { CORS_ORIGIN: _CORS_ORIGIN, ...rest } = validConfig;

    expect(() => validate(rest)).toThrow(/CORS_ORIGIN falta o está vacía/);
  });

  it('throws when CORS_ORIGIN has no protocol', () => {
    expect(() =>
      validate({ ...validConfig, CORS_ORIGIN: 'localhost:5173' }),
    ).toThrow(/CORS_ORIGIN debe empezar con http:\/\/ o https:\/\//);
  });

  it('combines every validation error into a single thrown message', () => {
    const {
      DATABASE_URL: _DATABASE_URL,
      CORS_ORIGIN: _CORS_ORIGIN,
      ...rest
    } = validConfig;

    expect(() => validate(rest)).toThrow(
      /DATABASE_URL falta o está vacía[\s\S]*CORS_ORIGIN falta o está vacía/,
    );
  });
});
