import { createCustomer } from '@/services/commercial';

const customerExample = {
  name: 'Mark Smith',
  taxId: '31-12345678-9',
  email: 'contacto@example.com',
  phone: '1234567890',
  address: 'Calle Falsa 123, Ciudad, País',
};

export function CustomerCreateExample() {
  async function handleCreateCustomer() {
    try {
      const customer = await createCustomer(customerExample);

      console.log('Cliente creado:', customer);
    } catch (error) {
      console.error(error);
    }
  }

  return (
    <section>
      <button
        className="border-2 cursor-pointer"
        type="button"
        onClick={handleCreateCustomer}
      >
        Crear cliente
      </button>
    </section>
  );
}
