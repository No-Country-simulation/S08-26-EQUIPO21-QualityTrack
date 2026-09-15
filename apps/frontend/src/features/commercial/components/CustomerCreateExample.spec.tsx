import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { createCustomer } from '@/services/commercial';
import { createTestQueryClient } from '@/test/query-client';
import type { Customer } from '@/types/customer';

import { CustomerCreateExample } from './CustomerCreateExample';

vi.mock('@/services/commercial', () => ({
  createCustomer: vi.fn(),
}));

function renderWithQueryClient() {
  const queryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <CustomerCreateExample />
    </QueryClientProvider>,
  );
}

describe('CustomerCreateExample', () => {
  it('calls createCustomer when the button is clicked', async () => {
    vi.mocked(createCustomer).mockResolvedValueOnce({
      id: 'c1',
      name: 'Mark Smith',
      taxId: '31-12345678-9',
      email: 'contacto@example.com',
      phone: '1234567890',
      address: 'Calle Falsa 123, Ciudad, País',
      archivedAt: null,
    });

    renderWithQueryClient();
    await userEvent.click(
      screen.getByRole('button', { name: 'Crear cliente' }),
    );

    expect(createCustomer).toHaveBeenCalledTimes(1);
    expect(
      await screen.findByRole('button', { name: 'Crear cliente' }),
    ).toBeEnabled();
  });

  it('disables the button while the mutation is pending', async () => {
    let resolveCreateCustomer!: (value: Customer) => void;
    vi.mocked(createCustomer).mockReturnValueOnce(
      new Promise<Customer>((resolve) => {
        resolveCreateCustomer = resolve;
      }),
    );

    renderWithQueryClient();
    await userEvent.click(
      screen.getByRole('button', { name: 'Crear cliente' }),
    );

    expect(screen.getByRole('button', { name: 'Creando...' })).toBeDisabled();

    resolveCreateCustomer({
      id: 'c1',
      name: 'Mark Smith',
      taxId: '31-12345678-9',
      email: 'contacto@example.com',
      phone: '1234567890',
      address: 'Calle Falsa 123, Ciudad, País',
      archivedAt: null,
    });

    expect(
      await screen.findByRole('button', { name: 'Crear cliente' }),
    ).toBeEnabled();
  });

  it('shows an error message when the mutation fails', async () => {
    vi.mocked(createCustomer).mockRejectedValueOnce(
      new Error('No se pudo crear el cliente.'),
    );

    renderWithQueryClient();
    await userEvent.click(
      screen.getByRole('button', { name: 'Crear cliente' }),
    );

    expect(
      await screen.findByText('No se pudo crear el cliente.'),
    ).toBeInTheDocument();
  });
});
