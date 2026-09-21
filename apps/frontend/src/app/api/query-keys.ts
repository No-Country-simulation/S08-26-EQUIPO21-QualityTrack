// Convención de query keys: un factory por entidad, jerárquico
// (all -> list -> detail), así invalidar `customers.all` invalida
// también cualquier `list`/`detail` derivado. Cada feature nueva agrega
// su propia entrada acá en vez de escribir arrays de keys sueltos.
export const queryKeys = {
  customers: {
    all: ['customers'] as const,
    list: () => [...queryKeys.customers.all, 'list'] as const,
    detail: (id: string) => [...queryKeys.customers.all, 'detail', id] as const,
  },
  commercialPanel: {
    all: ['commercial-panel'] as const,
  },
};
