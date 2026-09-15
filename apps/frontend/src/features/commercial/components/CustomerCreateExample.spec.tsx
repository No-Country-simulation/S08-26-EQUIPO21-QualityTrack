import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { createCustomer } from '@/services/commercial';

import { CustomerCreateExample } from './CustomerCreateExample';

vi.mock('@/services/commercial', () => ({
  createCustomer: vi.fn(),
}));

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

    render(<CustomerCreateExample />);
    await userEvent.click(
      screen.getByRole('button', { name: 'Crear cliente' }),
    );

    expect(createCustomer).toHaveBeenCalledTimes(1);
  });
});
