import { useMutation, useQueryClient } from '@tanstack/react-query';

import { queryKeys } from '@/app/api';
import { createCustomer } from '@/services/commercial';

const customerExample = {
  name: 'Mark Smith',
  taxId: '31-12345678-9',
  email: 'contacto@example.com',
  phone: '1234567890',
  address: 'Calle Falsa 123, Ciudad, País',
};

export function CustomerCreateExample() {
  const queryClient = useQueryClient();
  const { mutate, isPending, isError } = useMutation({
    mutationFn: createCustomer,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.customers.all });
    },
  });

  return (
    <section>
      <button
        className="border-2 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
        type="button"
        disabled={isPending}
        onClick={() => mutate(customerExample)}
      >
        {isPending ? 'Creando...' : 'Crear cliente'}
      </button>
      {isError && (
        <p className="text-sm text-red-600">No se pudo crear el cliente.</p>
      )}
    </section>
  );
}
