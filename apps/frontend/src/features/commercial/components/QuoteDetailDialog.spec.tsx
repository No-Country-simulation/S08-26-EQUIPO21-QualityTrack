import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import type { Customer } from '@/types/customer';
import { renderWithQueryClient } from '@/test/render';

import { approveQuote, rejectQuote } from '../api';
import type { QuoteSummary, RequestSummary } from '../types';
import { QuoteDetailDialog } from './QuoteDetailDialog';

vi.mock('../api');

const approveQuoteMock = vi.mocked(approveQuote);
const rejectQuoteMock = vi.mocked(rejectQuote);

const CUSTOMER: Customer = {
  id: 'c1',
  name: 'Perdro Romero',
  taxId: 'ESY2468259R',
  email: 'pedro@empresa.test',
  phone: null,
  address: null,
  archivedAt: null,
};

const REQUEST: RequestSummary = {
  id: 'r1',
  customerId: 'c1',
  piece: 'Buje bronce 25mm',
  quantity: 8,
  createdAt: '2026-09-21T10:00:00Z',
  customer: CUSTOMER,
};

function buildQuote(over: Partial<QuoteSummary> = {}): QuoteSummary {
  return {
    id: 'q1',
    requestId: 'r1',
    status: 'pending_approval',
    amount: '500.00',
    createdAt: '2026-09-21T10:00:00Z',
    updatedAt: '2026-09-21T10:00:00Z',
    request: REQUEST,
    ...over,
  };
}

describe('QuoteDetailDialog', () => {
  it('no renderiza el diálogo cuando quote es null', () => {
    renderWithQueryClient(
      <QuoteDetailDialog quote={null} onOpenChange={vi.fn()} />,
    );

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('cotización pendiente: muestra Aprobar/Rechazar', () => {
    renderWithQueryClient(
      <QuoteDetailDialog quote={buildQuote()} onOpenChange={vi.fn()} />,
    );

    expect(screen.getByRole('button', { name: 'Aprobar' })).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Rechazar' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Cerrar' }),
    ).not.toBeInTheDocument();
  });

  it('cotización ya decidida: solo muestra "Cerrar"', () => {
    renderWithQueryClient(
      <QuoteDetailDialog
        quote={buildQuote({ status: 'approved' })}
        onOpenChange={vi.fn()}
      />,
    );

    expect(screen.getByText('Aprobada')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cerrar' })).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Aprobar' }),
    ).not.toBeInTheDocument();
  });

  it('"Cerrar" llama a onOpenChange(false)', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    renderWithQueryClient(
      <QuoteDetailDialog
        quote={buildQuote({ status: 'rejected' })}
        onOpenChange={onOpenChange}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Cerrar' }));

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('aprobar llama a la mutación con el id y cierra el diálogo', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    approveQuoteMock.mockResolvedValue({
      ...buildQuote({ status: 'approved' }),
      workOrder: {
        id: 'wo1',
        quoteId: 'q1',
        status: 'created',
        createdAt: '2026-09-21T10:00:00Z',
        replacesWorkOrderId: null,
      },
    });
    renderWithQueryClient(
      <QuoteDetailDialog quote={buildQuote()} onOpenChange={onOpenChange} />,
    );

    await user.click(screen.getByRole('button', { name: 'Aprobar' }));

    expect(approveQuoteMock.mock.calls[0][0]).toBe('q1');
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
  });

  it('rechazar llama a la mutación con el id y cierra el diálogo', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    rejectQuoteMock.mockResolvedValue(buildQuote({ status: 'rejected' }));
    renderWithQueryClient(
      <QuoteDetailDialog quote={buildQuote()} onOpenChange={onOpenChange} />,
    );

    await user.click(screen.getByRole('button', { name: 'Rechazar' }));

    expect(rejectQuoteMock.mock.calls[0][0]).toBe('q1');
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
  });
});
