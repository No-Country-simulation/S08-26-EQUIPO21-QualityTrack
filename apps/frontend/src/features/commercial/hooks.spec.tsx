import { QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';

import { createTestQueryClient } from '@/test/query-client';

import {
  approveQuote,
  createQuote,
  createRequest,
  getQuotes,
  getRequests,
  rejectQuote,
} from './api';
import {
  useApproveQuote,
  useCreateQuote,
  useCreateRequest,
  useQuotes,
  useRejectQuote,
  useRequests,
} from './hooks';

vi.mock('./api');

const getRequestsMock = vi.mocked(getRequests);
const getQuotesMock = vi.mocked(getQuotes);
const createRequestMock = vi.mocked(createRequest);
const createQuoteMock = vi.mocked(createQuote);
const approveQuoteMock = vi.mocked(approveQuote);
const rejectQuoteMock = vi.mocked(rejectQuote);

function wrapperWithClient() {
  const queryClient = createTestQueryClient();
  const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
  function wrapper({ children }: { readonly children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  }
  return { wrapper, invalidateSpy };
}

describe('useRequests', () => {
  it('trae las solicitudes vía getRequests', async () => {
    getRequestsMock.mockResolvedValue([]);
    const { wrapper } = wrapperWithClient();

    const { result } = renderHook(() => useRequests(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(getRequestsMock).toHaveBeenCalled();
  });
});

describe('useQuotes', () => {
  it('propaga el status a getQuotes', async () => {
    getQuotesMock.mockResolvedValue([]);
    const { wrapper } = wrapperWithClient();

    const { result } = renderHook(() => useQuotes('approved'), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(getQuotesMock).toHaveBeenCalledWith('approved');
  });
});

describe('useCreateRequest', () => {
  it('crea la solicitud e invalida requests.all', async () => {
    createRequestMock.mockResolvedValue({
      id: 'r1',
    } as Awaited<ReturnType<typeof createRequest>>);
    const { wrapper, invalidateSpy } = wrapperWithClient();

    const { result } = renderHook(() => useCreateRequest(), { wrapper });
    result.current.mutate({ customerId: 'c1', piece: 'Eje', quantity: 5 });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ['requests'],
    });
  });
});

describe('useCreateQuote', () => {
  it('crea la cotización e invalida quotes.all', async () => {
    createQuoteMock.mockResolvedValue({
      id: 'q1',
    } as Awaited<ReturnType<typeof createQuote>>);
    const { wrapper, invalidateSpy } = wrapperWithClient();

    const { result } = renderHook(() => useCreateQuote(), { wrapper });
    result.current.mutate({ requestId: 'r1', amount: 1000 });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['quotes'] });
  });
});

describe('useApproveQuote', () => {
  it('aprueba e invalida quotes.all', async () => {
    approveQuoteMock.mockResolvedValue({
      id: 'q1',
    } as Awaited<ReturnType<typeof approveQuote>>);
    const { wrapper, invalidateSpy } = wrapperWithClient();

    const { result } = renderHook(() => useApproveQuote(), { wrapper });
    result.current.mutate('q1');

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(approveQuoteMock.mock.calls[0][0]).toBe('q1');
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['quotes'] });
  });
});

describe('useRejectQuote', () => {
  it('rechaza e invalida quotes.all', async () => {
    rejectQuoteMock.mockResolvedValue({
      id: 'q1',
    } as Awaited<ReturnType<typeof rejectQuote>>);
    const { wrapper, invalidateSpy } = wrapperWithClient();

    const { result } = renderHook(() => useRejectQuote(), { wrapper });
    result.current.mutate('q1');

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(rejectQuoteMock.mock.calls[0][0]).toBe('q1');
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['quotes'] });
  });
});
