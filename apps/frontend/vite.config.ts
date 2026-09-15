import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';
// `defineConfig` de 'vitest/config' extiende el tipo de Vite con el campo
// `test` -- un solo archivo de config para Vite y Vitest, sin duplicar
// plugins ni el alias de '@'.
import { defineConfig } from 'vitest/config';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    coverage: {
      provider: 'v8',
      reportsDirectory: './coverage',
      // 'lcov' además de 'text': Sonar (ver .github/workflows/ci-cd.yml)
      // lee coverage/lcov.info, no la salida de texto en consola.
      reporter: ['text', 'lcov'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/main.tsx', 'src/**/*.d.ts'],
    },
  },
});
