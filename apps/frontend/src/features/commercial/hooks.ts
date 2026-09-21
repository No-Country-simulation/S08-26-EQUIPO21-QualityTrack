import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { queryKeys } from '@/app/api';

import {
  approveQuote,
  createQuote,
  createRequest,
  getCommercialPanel,
  rejectQuote,
} from './api';

export function useCommercialPanel() {
  return useQuery({
    queryKey: queryKeys.commercialPanel.all,
    queryFn: getCommercialPanel,
  });
}

export function useCreateRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.commercialPanel.all,
      });
    },
  });
}

export function useCreateQuote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createQuote,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.commercialPanel.all,
      });
    },
  });
}

export function useApproveQuote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: approveQuote,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.commercialPanel.all,
      });
    },
  });
}

export function useRejectQuote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: rejectQuote,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.commercialPanel.all,
      });
    },
  });
}
