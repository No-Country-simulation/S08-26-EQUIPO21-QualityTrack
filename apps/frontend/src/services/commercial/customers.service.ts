import { apiClient, endpoints } from '@/app/api';
import type { CreateCustomerPayload, Customer } from '@/types/customer';

export async function createCustomer(
  payload: CreateCustomerPayload,
): Promise<Customer> {
  try {
    const response = await apiClient.post<Customer>(
      endpoints.customers.create,
      payload,
    );

    return response.data;
  } catch {
    throw new Error('No se pudo crear el cliente.');
  }
}
