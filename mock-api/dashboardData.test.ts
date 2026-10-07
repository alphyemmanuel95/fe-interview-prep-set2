import { describe, expect, it } from 'vitest';
import { advanceDashboard, createInitialState, type RandomSource } from './dashboardData.ts';

const NOW = new Date('2026-01-01T10:00:00.000Z');

// Replays a fixed sequence of "random" numbers so each call path is deterministic.
function sequence(...values: readonly number[]): RandomSource {
  let index = 0;
  return () => {
    const value = values[index % values.length] ?? 0;
    index += 1;
    return value;
  };
}

describe('advanceDashboard', () => {
  it('changes active users on every call even when no order arrives', () => {
    const initial = createInitialState();
    const next = advanceDashboard(initial, sequence(0, 0.9, 0.9), NOW);

    expect(next.payload.activeUsers).not.toBe(initial.payload.activeUsers);
    expect(next.payload.sales).toEqual(initial.payload.sales);
    expect(next.payload.recentOrders).toEqual([]);
  });

  it('adds a new order to the front and to the sales total', () => {
    const initial = createInitialState();
    const next = advanceDashboard(initial, sequence(0, 0.9, 0.1, 0, 0), NOW);
    const [order] = next.payload.recentOrders;

    expect(order).toMatchObject({ id: 'ORD-1001', createdAt: NOW.toISOString() });
    expect(next.payload.sales.totalCents).toBe(
      initial.payload.sales.totalCents + (order?.amountCents ?? Number.NaN),
    );
  });

  it('keeps at most five recent orders', () => {
    let state = createInitialState();
    for (let call = 0; call < 8; call += 1) {
      state = advanceDashboard(state, sequence(0.1), NOW);
    }

    expect(state.payload.recentOrders.map((order) => order.id)).toEqual([
      'ORD-1008',
      'ORD-1007',
      'ORD-1006',
      'ORD-1005',
      'ORD-1004',
    ]);
  });
});
