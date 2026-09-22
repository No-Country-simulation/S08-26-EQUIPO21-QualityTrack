import { z } from 'zod';

// Espejo de CreateQuoteDto (apps/backend/src/modules/quotes/dto/create-quote.dto.ts):
// positivo, hasta 2 decimales, tope de la columna Decimal(12,2).
const MAX_AMOUNT = 9_999_999_999.99;

function hasAtMostTwoDecimals(value: number): boolean {
  // Compara los dígitos decimales como string -- validar por
  // `value * 100` pisa el punto flotante (15000.555 * 100 no da 1500055.5).
  const [, decimals = ''] = value.toString().split('.');
  return decimals.length <= 2;
}

export const newQuoteSchema = z.object({
  amount: z.coerce
    .number({ error: 'Ingresar un monto.' })
    .positive('El monto debe ser mayor a 0.')
    .max(MAX_AMOUNT, 'El monto es demasiado alto.')
    .refine(hasAtMostTwoDecimals, 'El monto admite hasta 2 decimales.'),
});

// `amount` usa z.coerce: el input crudo del form es `unknown` (lo que
// tipea el usuario), la salida ya validada es `number`. RHF necesita
// ambos para tipar `useForm`/`handleSubmit` con un resolver de coerción.
export type NewQuoteFormInput = z.input<typeof newQuoteSchema>;
export type NewQuoteFormValues = z.output<typeof newQuoteSchema>;

export const newRequestSchema = z.object({
  customerId: z.string().min(1, 'Elegí un cliente.'),
  piece: z.string().trim().min(1, 'Ingresar la pieza.').max(150),
  quantity: z.coerce
    .number({ error: 'Ingresar una cantidad.' })
    .int('La cantidad debe ser un número entero.')
    .positive('La cantidad debe ser mayor a 0.'),
});

export type NewRequestFormInput = z.input<typeof newRequestSchema>;
export type NewRequestFormValues = z.output<typeof newRequestSchema>;
