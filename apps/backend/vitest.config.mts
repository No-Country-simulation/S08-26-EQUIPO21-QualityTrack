import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

// NestJS 12 y el cliente Prisma 7 son ESM: Vitest los carga sin
// configuración extra (ver ADR-0009). El único ajuste necesario es el
// plugin de SWC, que compila los decoradores de NestJS
// (`@Injectable()`, `@Controller()`, DI por constructor) -- esbuild, el
// transpilador por defecto de Vite, no emite el metadata que la
// inyección de dependencias necesita.
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
    include: ['src/**/*.spec.ts'],
    root: '.',
    coverage: {
      provider: 'v8',
      reportsDirectory: './coverage',
      include: ['src/**/*.ts'],
      exclude: ['src/generated/**', 'src/**/*.module.ts', 'src/main.ts'],
    },
  },
  resolve: {
    // Resuelve los alias de tsconfig ("paths") de forma nativa, sin el
    // plugin vite-tsconfig-paths.
    tsconfigPaths: true,
  },
});
