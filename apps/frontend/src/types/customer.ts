export interface Customer {
  id: string;
  name: string;
  taxId: string;
  email: string;
  phone: string | null;
  address: string | null;
  archivedAt: string | null;
}

export interface CreateCustomerPayload {
  name: string;
  taxId: string;
  email: string;
  phone?: string;
  address?: string;
}
