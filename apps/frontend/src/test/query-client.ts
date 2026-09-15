import { QueryClient } from '@tanstack/react-query';

// Sin retry: un test que verifica el estado de error de una mutation/query
// no debería esperar los reintentos que sí tienen sentido en producción.
export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
}
