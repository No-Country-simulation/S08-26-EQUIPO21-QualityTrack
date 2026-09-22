import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';

import { createTestQueryClient } from '@/test/query-client';
import { createCustomer } from '@/services/commercial';
import type { Customer } from '@/types/customer';

import { getCustomers } from '../api';
import { ClientCombobox } from './ClientCombobox';

vi.mock('../api');
vi.mock('@/services/commercial');

const getCustomersMock = vi.mocked(getCustomers);
const createCustomerMock = vi.mocked(createCustomer);

const PEDRO: Customer = {
  id: 'c1',
  name: 'Perdro Romero',
  taxId: 'ESY2468259R',
  email: 'pedro@empresa.test',
  phone: null,
  address: null,
  archivedAt: null,
};

const METALURGICA: Customer = {
  id: 'c2',
  name: 'Metalúrgica del Sur',
  taxId: '30-71234567-9',
  email: 'contacto@metalurgicasur.test',
  phone: null,
  address: null,
  archivedAt: null,
};

/** Wrapper con estado propio -- ClientCombobox es controlado, así que
 * "seleccionar" solo se refleja en pantalla si algo retroalimenta `value`
 * con lo que llega por `onChange`, igual que haría un Controller de RHF. */
function ControlledCombobox({
  onChange,
}: {
  readonly onChange: (customerId: string) => void;
}) {
  const [value, setValue] = useState<string | null>(null);
  return (
    <ClientCombobox
      value={value}
      onChange={(customerId) => {
        setValue(customerId);
        onChange(customerId);
      }}
    />
  );
}

function renderCombobox(onChange = vi.fn()) {
  const queryClient = createTestQueryClient();
  render(
    <QueryClientProvider client={queryClient}>
      <ControlledCombobox onChange={onChange} />
    </QueryClientProvider>,
  );
  return { onChange };
}

beforeEach(() => {
  getCustomersMock.mockResolvedValue([PEDRO, METALURGICA]);
});

describe('ClientCombobox', () => {
  it('no muestra resultados hasta que se escribe algo en el buscador', async () => {
    const user = userEvent.setup();
    renderCombobox();
    await waitFor(() => expect(getCustomersMock).toHaveBeenCalled());

    expect(screen.queryByText('Perdro Romero')).not.toBeInTheDocument();

    await user.type(
      screen.getByPlaceholderText('Escribir para buscar o crear…'),
      'Per',
    );

    expect(screen.getByText('Perdro Romero')).toBeInTheDocument();
    expect(screen.queryByText('Metalúrgica del Sur')).not.toBeInTheDocument();
  });

  it('selecciona un cliente de la lista', async () => {
    const user = userEvent.setup();
    const { onChange } = renderCombobox();
    await waitFor(() => expect(getCustomersMock).toHaveBeenCalled());

    await user.type(
      screen.getByPlaceholderText('Escribir para buscar o crear…'),
      'Perdro',
    );
    await user.click(screen.getByText('Perdro Romero'));

    expect(onChange).toHaveBeenCalledWith('c1');
    expect(
      screen.queryByPlaceholderText('Escribir para buscar o crear…'),
    ).not.toBeInTheDocument();
  });

  it('pasa a modo crear con el nombre tipeado y crea el cliente', async () => {
    const user = userEvent.setup();
    const created: Customer = {
      id: 'c3',
      name: 'Cliente Nuevo SA',
      taxId: '30-99999999-1',
      email: 'contacto@nuevo.test',
      phone: null,
      address: null,
      archivedAt: null,
    };
    createCustomerMock.mockResolvedValue(created);
    const { onChange } = renderCombobox();
    await waitFor(() => expect(getCustomersMock).toHaveBeenCalled());

    await user.type(
      screen.getByPlaceholderText('Escribir para buscar o crear…'),
      'Cliente Nuevo SA',
    );
    await user.click(
      screen.getByRole('button', { name: /Crear «Cliente Nuevo SA»/ }),
    );

    expect(
      screen.getByText('Crear «Cliente Nuevo SA»', { selector: 'p' }),
    ).toBeInTheDocument();

    await user.type(
      screen.getByLabelText('CUIT / identificador tributario'),
      '30-99999999-1',
    );
    await user.type(screen.getByLabelText('Email'), 'contacto@nuevo.test');
    await user.click(screen.getByRole('button', { name: 'Crear cliente' }));

    await waitFor(() => expect(createCustomerMock).toHaveBeenCalled());
    expect(createCustomerMock.mock.calls[0][0]).toEqual({
      name: 'Cliente Nuevo SA',
      taxId: '30-99999999-1',
      email: 'contacto@nuevo.test',
    });
    expect(onChange).toHaveBeenCalledWith('c3');
  });
});
