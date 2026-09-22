import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { queryKeys } from '@/app/api';
import { createCustomer } from '@/services/commercial';

import { getCustomers } from './api';

export function useCustomers() {
  return useQuery({
    queryKey: queryKeys.customers.list(),
    queryFn: getCustomers,
  });
}

export function useCreateCustomer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createCustomer,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.customers.all });
    },
  });
}
