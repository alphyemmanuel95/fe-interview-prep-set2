import { describe, expect, it } from 'vitest';
import { calculateTotals, formatCents, toCents } from './money';

describe('money', () => {
  it('converts prices to integer cents without float drift', () => {
    expect(toCents(0.1 + 0.2)).toBe(30);
    expect(toCents(19.99)).toBe(1999);
  });

  it('calculates subtotal, 18% tax rounded once, and total', () => {
    const totals = calculateTotals([
      { priceCents: 1999, quantity: 2 },
      { priceCents: 999, quantity: 1 },
    ]);
    // 4997 * 0.18 = 899.46, which rounds to 899.
    expect(totals).toEqual({ subtotalCents: 4997, taxCents: 899, totalCents: 5896 });
  });

  it('returns zeros for an empty cart', () => {
    expect(calculateTotals([])).toEqual({ subtotalCents: 0, taxCents: 0, totalCents: 0 });
  });

  it('formats cents as USD with 2 decimals', () => {
    expect(formatCents(5896)).toBe('$58.96');
    expect(formatCents(0)).toBe('$0.00');
  });
});
