export const endpoints = {
  customers: {
    create: '/customers',
    list: '/customers',
  },
  requests: {
    create: '/requests',
  },
  quotes: {
    create: '/quotes',
    commercialPanel: '/quotes/commercial-panel',
    approve: (id: string) => `/quotes/${id}/approve`,
    reject: (id: string) => `/quotes/${id}/reject`,
  },
} as const;
