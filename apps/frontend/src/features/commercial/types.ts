import type { Customer } from '@/types/customer';

export type QuoteStatus = 'pending_approval' | 'approved' | 'rejected';

const QUOTE_STATUS_LABELS: Record<QuoteStatus, string> = {
  pending_approval: 'Pendiente',
  approved: 'Aprobada',
  rejected: 'Rechazada',
};

export function quoteStatusLabel(status: QuoteStatus): string {
  return QUOTE_STATUS_LABELS[status];
}

export interface RequestSummary {
  id: string;
  customerId: string;
  piece: string;
  quantity: number;
  createdAt: string;
  customer: Customer;
}

export interface QuoteSummary {
  id: string;
  requestId: string;
  status: QuoteStatus;
  /** Decimal(12,2) del backend, serializado como string para no perder precisión. */
  amount: string;
  createdAt: string;
  updatedAt: string;
  request: RequestSummary;
}

export interface WorkOrderSummary {
  id: string;
  quoteId: string;
  status: string;
  createdAt: string;
  replacesWorkOrderId: string | null;
}

export interface ApprovedQuote extends QuoteSummary {
  workOrder: WorkOrderSummary;
}

export interface CreateQuotePayload {
  requestId: string;
  amount: number;
}

export interface CreateRequestPayload {
  customerId: string;
  piece: string;
  quantity: number;
}
