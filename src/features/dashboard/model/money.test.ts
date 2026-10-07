import { describe, expect, it } from 'vitest';
import { formatCents } from './money';

describe('formatCents', () => {
  it('formats integer cents with two decimals', () => {
    expect(formatCents(1_234_567, 'USD')).toBe('$12,345.67');
    expect(formatCents(500, 'USD')).toBe('$5.00');
  });
});
