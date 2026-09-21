import { apiClient, endpoints } from '@/app/api';

import type {
  ApprovedQuote,
  CommercialPanel,
  CreateQuotePayload,
  CreateRequestPayload,
  QuoteSummary,
  RequestSummary,
} from './types';

export async function getCommercialPanel(): Promise<CommercialPanel> {
  try {
    const response = await apiClient.get<CommercialPanel>(
      endpoints.quotes.commercialPanel,
    );

    return response.data;
  } catch {
    throw new Error('No se pudo cargar el panel comercial.');
  }
}

export async function createRequest(
  payload: CreateRequestPayload,
): Promise<RequestSummary> {
  try {
    const response = await apiClient.post<RequestSummary>(
      endpoints.requests.create,
      payload,
    );

    return response.data;
  } catch {
    throw new Error('No se pudo crear la solicitud.');
  }
}

export async function createQuote(
  payload: CreateQuotePayload,
): Promise<QuoteSummary> {
  try {
    const response = await apiClient.post<QuoteSummary>(
      endpoints.quotes.create,
      payload,
    );

    return response.data;
  } catch {
    throw new Error('No se pudo crear la cotización.');
  }
}

export async function approveQuote(id: string): Promise<ApprovedQuote> {
  try {
    const response = await apiClient.patch<ApprovedQuote>(
      endpoints.quotes.approve(id),
    );

    return response.data;
  } catch {
    throw new Error('No se pudo aprobar la cotización.');
  }
}

export async function rejectQuote(id: string): Promise<QuoteSummary> {
  try {
    const response = await apiClient.patch<QuoteSummary>(
      endpoints.quotes.reject(id),
    );

    return response.data;
  } catch {
    throw new Error('No se pudo rechazar la cotización.');
  }
}
