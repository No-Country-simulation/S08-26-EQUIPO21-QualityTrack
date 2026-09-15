import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

// Tests end-to-end: levantan la app completa (AppModule) y le pegan por
// HTTP con Supertest. Necesitan un PostgreSQL real (el `compose.yml` de
// desarrollo). Misma transpilación que los unit tests (SWC para los
// decoradores de NestJS, ver vitest.config.mts y ADR-0009); cambia el
// patrón de archivos y los timeouts.
//
// No se usa `mergeConfig` con la config unit porque fusiona los arrays
// `include` en vez de reemplazarlos, y terminaría corriendo también los
// `src/**/*.spec.ts`.
export default defineConfig({
  plugins: [
    swc.vite({
      module: { type: 'es6' },
      jsc: {
        target: 'es2023',
        transform: {
          legacyDecorator: true,
          decoratorMetadata: true,
        },
      },
    }),
  ],
  test: {
    globals: true,
    environment: 'node',
    root: '.',
    include: ['test/**/*.e2e-spec.ts'],
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
  resolve: {
    tsconfigPaths: true,
  },
});
