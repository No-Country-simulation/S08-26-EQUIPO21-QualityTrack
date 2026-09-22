import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import type { Customer } from '@/types/customer';
import { renderWithQueryClient } from '@/test/render';

import { createQuote } from '../api';
import type { RequestSummary } from '../types';
import { NewQuoteDialog } from './NewQuoteDialog';

vi.mock('../api');

const createQuoteMock = vi.mocked(createQuote);

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

describe('NewQuoteDialog', () => {
  it('no renderiza el diálogo cuando request es null', () => {
    renderWithQueryClient(
      <NewQuoteDialog request={null} onOpenChange={vi.fn()} />,
    );

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('muestra la solicitud de origen en la descripción', () => {
    renderWithQueryClient(
      <NewQuoteDialog request={REQUEST} onOpenChange={vi.fn()} />,
    );

    expect(
      screen.getByText('Solicitud de Perdro Romero: Buje bronce 25mm · x8'),
    ).toBeInTheDocument();
  });

  it('rechaza el submit sin un monto', async () => {
    const user = userEvent.setup();
    renderWithQueryClient(
      <NewQuoteDialog request={REQUEST} onOpenChange={vi.fn()} />,
    );

    await user.click(screen.getByRole('button', { name: 'Crear cotización' }));

    // El input vacío coerciona a 0 (no a NaN), así que falla `.positive()`.
    expect(
      await screen.findByText('El monto debe ser mayor a 0.'),
    ).toBeInTheDocument();
    expect(createQuoteMock).not.toHaveBeenCalled();
  });

  it('crea la cotización con el monto ingresado y cierra el diálogo', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    createQuoteMock.mockResolvedValue({
      id: 'q1',
      requestId: 'r1',
      status: 'pending_approval',
      amount: '1500.5',
      createdAt: '2026-09-21T10:00:00Z',
      updatedAt: '2026-09-21T10:00:00Z',
      request: REQUEST,
    });
    renderWithQueryClient(
      <NewQuoteDialog request={REQUEST} onOpenChange={onOpenChange} />,
    );

    await user.type(screen.getByRole('spinbutton'), '1500.5');
    await user.click(screen.getByRole('button', { name: 'Crear cotización' }));

    await waitFor(() => expect(createQuoteMock).toHaveBeenCalled());
    expect(createQuoteMock.mock.calls[0][0]).toEqual({
      requestId: 'r1',
      amount: 1500.5,
    });
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
