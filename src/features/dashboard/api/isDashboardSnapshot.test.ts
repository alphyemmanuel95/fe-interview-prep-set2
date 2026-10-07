import { describe, expect, it } from 'vitest';
import { isDashboardSnapshot } from './isDashboardSnapshot';

const validSnapshot = {
  sales: { totalCents: 1000, currency: 'USD' },
  activeUsers: 42,
  recentOrders: [
    { id: 'ORD-1', customer: 'Ada', amountCents: 500, createdAt: '2026-01-01T00:00:00Z' },
  ],
};

describe('isDashboardSnapshot', () => {
  it('accepts a well-formed response', () => {
    expect(isDashboardSnapshot(validSnapshot)).toBe(true);
  });

  it.each([
    ['null', null],
    ['missing sales', { ...validSnapshot, sales: undefined }],
    ['fractional cents', { ...validSnapshot, sales: { totalCents: 10.5, currency: 'USD' } }],
    ['non-numeric active users', { ...validSnapshot, activeUsers: '42' }],
    ['malformed order', { ...validSnapshot, recentOrders: [{ id: 1 }] }],
  ])('rejects %s', (_label, value) => {
    expect(isDashboardSnapshot(value)).toBe(false);
  });
});
