import { z } from 'zod';

// Espejo de CreateCustomerDto (apps/backend/src/modules/quotes/dto/create-customer.dto.ts):
// name lo aporta el texto ya tipeado en el buscador, taxId y email son
// obligatorios para dar de alta el cliente (ADR-0007 / ADR-0008) y el
// combobox no los pide de entrada -- se completan al confirmar "crear".
export const newClientSchema = z.object({
  name: z.string().trim().min(1, 'Ingresar un nombre.').max(200),
  taxId: z
    .string()
    .trim()
    .min(1, 'Ingresar el identificador tributario.')
    .max(50),
  email: z.email('Ingresar un email válido.').max(320),
});

export type NewClientFormValues = z.infer<typeof newClientSchema>;
