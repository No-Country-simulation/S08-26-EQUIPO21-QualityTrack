import { QueryClientProvider } from '@tanstack/react-query';
import { render, type RenderOptions } from '@testing-library/react';
import type { ReactElement } from 'react';

import { createTestQueryClient } from './query-client';

// Wrapper compartido para componentes que usan hooks de TanStack Query --
// evita repetir el mismo QueryClientProvider en cada spec.
export function renderWithQueryClient(
  ui: ReactElement,
  options?: RenderOptions,
) {
  const queryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>,
    options,
  );
}
