import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { getCustomers } from '@/features/clients/api';
import { renderWithQueryClient } from '@/test/render';
import type { Customer } from '@/types/customer';

import { createRequest } from '../api';
import { NewRequestDialog } from './NewRequestDialog';

vi.mock('../api');
vi.mock('@/features/clients/api');
vi.mock('@/services/commercial');

const createRequestMock = vi.mocked(createRequest);
const getCustomersMock = vi.mocked(getCustomers);

const PEDRO: Customer = {
  id: 'c1',
  name: 'Perdro Romero',
  taxId: 'ESY2468259R',
  email: 'pedro@empresa.test',
  phone: null,
  address: null,
  archivedAt: null,
};

beforeEach(() => {
  getCustomersMock.mockResolvedValue([PEDRO]);
});

describe('NewRequestDialog', () => {
  it('no renderiza el diálogo cuando open es false', () => {
    renderWithQueryClient(
      <NewRequestDialog open={false} onOpenChange={vi.fn()} />,
    );

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('rechaza el submit sin cliente, pieza ni cantidad', async () => {
    const user = userEvent.setup();
    renderWithQueryClient(<NewRequestDialog open onOpenChange={vi.fn()} />);
    await waitFor(() => expect(getCustomersMock).toHaveBeenCalled());

    await user.click(screen.getByRole('button', { name: 'Crear solicitud' }));

    expect(await screen.findByText('Elegí un cliente.')).toBeInTheDocument();
    expect(screen.getByText('Ingresar la pieza.')).toBeInTheDocument();
    expect(createRequestMock).not.toHaveBeenCalled();
  });

  it('crea la solicitud con cliente, pieza y cantidad, y cierra el diálogo', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    createRequestMock.mockResolvedValue({
      id: 'r1',
      customerId: 'c1',
      piece: 'Brida DN200',
      quantity: 12,
      createdAt: '2026-09-22T10:00:00Z',
      customer: PEDRO,
    });
    renderWithQueryClient(
      <NewRequestDialog open onOpenChange={onOpenChange} />,
    );
    await waitFor(() => expect(getCustomersMock).toHaveBeenCalled());

    await user.type(
      screen.getByPlaceholderText('Escribir para buscar o crear…'),
      'Perdro',
    );
    await user.click(screen.getByText('Perdro Romero'));

    await user.type(screen.getByPlaceholderText('Brida DN200'), 'Eje 40mm');
    await user.type(screen.getByPlaceholderText('12'), '5');

    await user.click(screen.getByRole('button', { name: 'Crear solicitud' }));

    await waitFor(() => expect(createRequestMock).toHaveBeenCalled());
    expect(createRequestMock.mock.calls[0][0]).toEqual({
      customerId: 'c1',
      piece: 'Eje 40mm',
      quantity: 5,
    });
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
