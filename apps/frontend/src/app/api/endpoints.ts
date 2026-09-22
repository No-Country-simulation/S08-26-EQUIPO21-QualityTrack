export const endpoints = {
  customers: {
    create: '/customers',
    list: '/customers',
  },
  requests: {
    create: '/requests',
    list: '/requests',
  },
  quotes: {
    create: '/quotes',
    list: '/quotes',
    approve: (id: string) => `/quotes/${id}/approve`,
    reject: (id: string) => `/quotes/${id}/reject`,
  },
} as const;
