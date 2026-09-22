import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import type { Customer } from '@/types/customer';
import { renderWithQueryClient } from '@/test/render';

import { approveQuote, rejectQuote } from '../api';
import type { QuoteSummary, RequestSummary } from '../types';
import { QuotesTable } from './QuotesTable';

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

describe('QuotesTable', () => {
  it('cotización pendiente: muestra Aprobar/Rechazar, no "Ver detalle"', () => {
    renderWithQueryClient(
      <QuotesTable
        quotes={[buildQuote()]}
        isLoading={false}
        onViewDetail={vi.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: 'Aprobar' })).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Rechazar' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Ver detalle' }),
    ).not.toBeInTheDocument();
  });

  it('cotización ya decidida: muestra "Ver detalle" y no acciones de aprobación', () => {
    const approved = buildQuote({ id: 'q2', status: 'approved' });
    renderWithQueryClient(
      <QuotesTable
        quotes={[approved]}
        isLoading={false}
        onViewDetail={vi.fn()}
      />,
    );

    expect(
      screen.getByRole('button', { name: 'Ver detalle' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Aprobar' }),
    ).not.toBeInTheDocument();
  });

  it('"Ver detalle" llama a onViewDetail con la cotización', async () => {
    const user = userEvent.setup();
    const rejected = buildQuote({ id: 'q3', status: 'rejected' });
    const onViewDetail = vi.fn();
    renderWithQueryClient(
      <QuotesTable
        quotes={[rejected]}
        isLoading={false}
        onViewDetail={onViewDetail}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Ver detalle' }));

    expect(onViewDetail).toHaveBeenCalledWith(rejected);
  });

  it('"Aprobar" llama a la mutación de aprobación con el id', async () => {
    const user = userEvent.setup();
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
      <QuotesTable
        quotes={[buildQuote()]}
        isLoading={false}
        onViewDetail={vi.fn()}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Aprobar' }));

    expect(approveQuoteMock.mock.calls[0][0]).toBe('q1');
  });

  it('"Rechazar" llama a la mutación de rechazo con el id', async () => {
    const user = userEvent.setup();
    rejectQuoteMock.mockResolvedValue(buildQuote({ status: 'rejected' }));
    renderWithQueryClient(
      <QuotesTable
        quotes={[buildQuote()]}
        isLoading={false}
        onViewDetail={vi.fn()}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Rechazar' }));

    expect(rejectQuoteMock.mock.calls[0][0]).toBe('q1');
  });

  it('mientras aprueba, deshabilita ambos botones y muestra el texto en curso', async () => {
    const user = userEvent.setup();
    let resolveApprove!: (value: unknown) => void;
    approveQuoteMock.mockReturnValue(
      new Promise((resolve) => {
        resolveApprove = resolve;
      }),
    );
    renderWithQueryClient(
      <QuotesTable
        quotes={[buildQuote()]}
        isLoading={false}
        onViewDetail={vi.fn()}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Aprobar' }));

    expect(
      await screen.findByRole('button', { name: 'Aprobando...' }),
    ).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Rechazar' })).toBeDisabled();

    resolveApprove({
      ...buildQuote({ status: 'approved' }),
      workOrder: {
        id: 'wo1',
        quoteId: 'q1',
        status: 'created',
        createdAt: '2026-09-21T10:00:00Z',
        replacesWorkOrderId: null,
      },
    });

    await waitFor(() =>
      expect(
        screen.queryByRole('button', { name: 'Aprobando...' }),
      ).not.toBeInTheDocument(),
    );
  });
});
