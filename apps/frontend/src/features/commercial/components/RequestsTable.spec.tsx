import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import type { Customer } from '@/types/customer';

import type { QuoteSummary, RequestSummary } from '../types';
import { RequestsTable } from './RequestsTable';

const CUSTOMER: Customer = {
  id: 'c1',
  name: 'Perdro Romero',
  taxId: 'ESY2468259R',
  email: 'pedro@empresa.test',
  phone: null,
  address: null,
  archivedAt: null,
};

const UNQUOTED: RequestSummary = {
  id: 'r1',
  customerId: 'c1',
  piece: 'Tornillo 45HK',
  quantity: 500,
  createdAt: '2026-09-21T10:00:00Z',
  customer: CUSTOMER,
};

const QUOTED_REQUEST: RequestSummary = {
  id: 'r2',
  customerId: 'c1',
  piece: 'Buje bronce 25mm',
  quantity: 8,
  createdAt: '2026-09-21T10:00:00Z',
  customer: CUSTOMER,
};

const QUOTE: QuoteSummary = {
  id: 'q1',
  requestId: 'r2',
  status: 'pending_approval',
  amount: '500.00',
  createdAt: '2026-09-21T10:00:00Z',
  updatedAt: '2026-09-21T10:00:00Z',
  request: QUOTED_REQUEST,
};

describe('RequestsTable', () => {
  it('sin cotización asociada: muestra "Sin cotizar" y el botón de crear', () => {
    const onCreateQuote = vi.fn();
    const onViewQuote = vi.fn();
    render(
      <RequestsTable
        requests={[UNQUOTED]}
        isLoading={false}
        quotesByRequestId={new Map()}
        onCreateQuote={onCreateQuote}
        onViewQuote={onViewQuote}
      />,
    );

    expect(screen.getByText('Sin cotizar')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Crear cotización' }),
    ).toBeInTheDocument();
  });

  it('crea la cotización al hacer clic en "Crear cotización"', async () => {
    const user = userEvent.setup();
    const onCreateQuote = vi.fn();
    render(
      <RequestsTable
        requests={[UNQUOTED]}
        isLoading={false}
        quotesByRequestId={new Map()}
        onCreateQuote={onCreateQuote}
        onViewQuote={vi.fn()}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Crear cotización' }));

    expect(onCreateQuote).toHaveBeenCalledWith(UNQUOTED);
  });

  it('con cotización asociada: muestra su estado y "Ver detalle"', async () => {
    const user = userEvent.setup();
    const onViewQuote = vi.fn();
    render(
      <RequestsTable
        requests={[QUOTED_REQUEST]}
        isLoading={false}
        quotesByRequestId={new Map([['r2', QUOTE]])}
        onCreateQuote={vi.fn()}
        onViewQuote={onViewQuote}
      />,
    );

    expect(screen.getByText('Pendiente')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Ver detalle' }));

    expect(onViewQuote).toHaveBeenCalledWith(QUOTE);
  });

  it('muestra pieza y cantidad como columnas separadas', () => {
    render(
      <RequestsTable
        requests={[UNQUOTED]}
        isLoading={false}
        quotesByRequestId={new Map()}
        onCreateQuote={vi.fn()}
        onViewQuote={vi.fn()}
      />,
    );

    expect(screen.getByText('Tornillo 45HK')).toBeInTheDocument();
    expect(screen.getByText('500')).toBeInTheDocument();
  });
});
