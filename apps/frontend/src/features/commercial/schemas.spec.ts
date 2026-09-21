import {
  composeRequestDescription,
  newQuoteSchema,
  newRequestSchema,
} from './schemas';

describe('newQuoteSchema', () => {
  it('accepts a positive amount with up to 2 decimals', () => {
    const result = newQuoteSchema.safeParse({ amount: 15000.5 });

    expect(result.success).toBe(true);
  });

  it('rejects an amount that is zero or negative', () => {
    expect(newQuoteSchema.safeParse({ amount: 0 }).success).toBe(false);
    expect(newQuoteSchema.safeParse({ amount: -100 }).success).toBe(false);
  });

  it('rejects more than 2 decimal places', () => {
    const result = newQuoteSchema.safeParse({ amount: 15000.555 });

    expect(result.success).toBe(false);
  });

  it('rejects an amount above the Decimal(12,2) maximum', () => {
    const result = newQuoteSchema.safeParse({ amount: 10_000_000_000 });

    expect(result.success).toBe(false);
  });

  it('rejects a missing amount', () => {
    const result = newQuoteSchema.safeParse({});

    expect(result.success).toBe(false);
  });
});

describe('newRequestSchema', () => {
  const valid = { customerId: 'c1', piece: 'Brida DN200', quantity: 12 };

  it('accepts a complete request', () => {
    expect(newRequestSchema.safeParse(valid).success).toBe(true);
  });

  it('rejects a missing customerId', () => {
    const result = newRequestSchema.safeParse({ ...valid, customerId: '' });

    expect(result.success).toBe(false);
  });

  it('rejects an empty piece', () => {
    const result = newRequestSchema.safeParse({ ...valid, piece: '  ' });

    expect(result.success).toBe(false);
  });

  it('rejects a non-integer quantity', () => {
    const result = newRequestSchema.safeParse({ ...valid, quantity: 2.5 });

    expect(result.success).toBe(false);
  });

  it('rejects a quantity that is zero or negative', () => {
    expect(newRequestSchema.safeParse({ ...valid, quantity: 0 }).success).toBe(
      false,
    );
    expect(newRequestSchema.safeParse({ ...valid, quantity: -3 }).success).toBe(
      false,
    );
  });
});

describe('composeRequestDescription', () => {
  it('joins the piece and quantity with the "· x" separator', () => {
    expect(composeRequestDescription('Brida DN200', 12)).toBe(
      'Brida DN200 · x12',
    );
  });
});
