import { apiClient, endpoints } from '@/app/api';
import type { Customer } from '@/types/customer';

export async function getCustomers(): Promise<Customer[]> {
  try {
    const response = await apiClient.get<Customer[]>(endpoints.customers.list);

    return response.data;
  } catch {
    throw new Error('No se pudo cargar la lista de clientes.');
  }
}
