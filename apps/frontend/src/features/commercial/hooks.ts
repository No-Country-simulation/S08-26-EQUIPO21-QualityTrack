import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { queryKeys } from '@/app/api';

import {
  approveQuote,
  createQuote,
  createRequest,
  getQuotes,
  getRequests,
  rejectQuote,
} from './api';
import type { QuoteStatus } from './types';

/** Todas las solicitudes, tengan o no cotización asociada. */
export function useRequests() {
  return useQuery({
    queryKey: queryKeys.requests.list(),
    queryFn: getRequests,
  });
}

/** Cotizaciones en cualquier estado (sin `status`, todas). */
export function useQuotes(status?: QuoteStatus) {
  return useQuery({
    queryKey: queryKeys.quotes.list(status),
    queryFn: () => getQuotes(status),
  });
}

export function useCreateRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.requests.all });
    },
  });
}

export function useCreateQuote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createQuote,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.quotes.all });
    },
  });
}

export function useApproveQuote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: approveQuote,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.quotes.all });
    },
  });
}

export function useRejectQuote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: rejectQuote,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.quotes.all });
    },
  });
}
