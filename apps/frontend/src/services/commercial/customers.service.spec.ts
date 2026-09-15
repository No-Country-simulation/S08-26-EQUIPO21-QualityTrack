import { apiClient } from '@/app/api';
import type { CreateCustomerPayload, Customer } from '@/types/customer';

import { createCustomer } from './customers.service';

vi.mock('@/app/api', () => ({
  apiClient: { post: vi.fn() },
  endpoints: { customers: { create: '/customers' } },
}));

const payload: CreateCustomerPayload = {
  name: 'Mark Smith',
  taxId: '31-12345678-9',
  email: 'contacto@example.com',
};

const customer: Customer = {
  id: 'c1',
  ...payload,
  phone: null,
  address: null,
  archivedAt: null,
};

describe('createCustomer', () => {
  it('posts the payload to /customers and returns the created customer', async () => {
    vi.mocked(apiClient.post).mockResolvedValueOnce({ data: customer });

    const result = await createCustomer(payload);

    expect(apiClient.post).toHaveBeenCalledWith('/customers', payload);
    expect(result).toEqual(customer);
  });

  it('throws a domain error when the request fails', async () => {
    vi.mocked(apiClient.post).mockRejectedValueOnce(new Error('network error'));

    await expect(createCustomer(payload)).rejects.toThrow(
      'No se pudo crear el cliente.',
    );
  });
});
