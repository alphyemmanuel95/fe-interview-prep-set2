import { describe, expect, it } from 'vitest';
import {
  ACTIVE_USERS_HISTORY_LENGTH,
  dashboardReducer,
  initialDashboardState,
  type DashboardState,
} from './dashboardReducer';
import type { DashboardSnapshot } from './types';

const snapshot = (overrides: Partial<DashboardSnapshot> = {}): DashboardSnapshot => ({
  sales: { totalCents: 10_000, currency: 'USD' },
  activeUsers: 100,
  recentOrders: [
    { id: 'ORD-1', customer: 'Ada', amountCents: 500, createdAt: '2026-01-01T00:00:00Z' },
  ],
  ...overrides,
});

function readyState(state: DashboardState) {
  if (state.status !== 'ready') {
    throw new Error(`Expected ready state, got ${state.status}`);
  }
  return state;
}

describe('dashboardReducer', () => {
  it('stores the first snapshot', () => {
    const state = readyState(
      dashboardReducer(initialDashboardState, {
        type: 'received',
        snapshot: snapshot(),
        receivedAt: 1,
      }),
    );

    expect(state.data.activeUsersHistory).toEqual([100]);
    expect(state.data.updatedAt).toBe(1);
  });

  it('keeps references for slices whose content did not change', () => {
    const first = readyState(
      dashboardReducer(initialDashboardState, {
        type: 'received',
        snapshot: snapshot(),
        receivedAt: 1,
      }),
    );
    // A structurally equal but freshly parsed response, with only active users changed.
    const second = readyState(
      dashboardReducer(first, {
        type: 'received',
        snapshot: structuredClone(snapshot({ activeUsers: 120 })),
        receivedAt: 2,
      }),
    );

    expect(second.data.sales).toBe(first.data.sales);
    expect(second.data.recentOrders).toBe(first.data.recentOrders);
    expect(second.data.activeUsersHistory).toEqual([100, 120]);
  });

  it('replaces slices whose content changed', () => {
    const first = readyState(
      dashboardReducer(initialDashboardState, {
        type: 'received',
        snapshot: snapshot(),
        receivedAt: 1,
      }),
    );
    const second = readyState(
      dashboardReducer(first, {
        type: 'received',
        snapshot: snapshot({ sales: { totalCents: 20_000, currency: 'USD' }, recentOrders: [] }),
        receivedAt: 2,
      }),
    );

    expect(second.data.sales.totalCents).toBe(20_000);
    expect(second.data.recentOrders).toEqual([]);
  });

  it('caps the active users history', () => {
    let state: DashboardState = initialDashboardState;
    for (let users = 0; users < ACTIVE_USERS_HISTORY_LENGTH + 5; users += 1) {
      state = dashboardReducer(state, {
        type: 'received',
        snapshot: snapshot({ activeUsers: users }),
        receivedAt: users,
      });
    }
    const history = readyState(state).data.activeUsersHistory;

    expect(history).toHaveLength(ACTIVE_USERS_HISTORY_LENGTH);
    expect(history.at(-1)).toBe(ACTIVE_USERS_HISTORY_LENGTH + 4);
  });

  it('reports an initial failure as an error state', () => {
    expect(dashboardReducer(initialDashboardState, { type: 'failed', error: 'down' })).toEqual({
      status: 'error',
      error: 'down',
    });
  });

  it('keeps existing data when a refresh fails, and clears the error on the next success', () => {
    const ready = dashboardReducer(initialDashboardState, {
      type: 'received',
      snapshot: snapshot(),
      receivedAt: 1,
    });
    const failed = readyState(dashboardReducer(ready, { type: 'failed', error: 'down' }));
    expect(failed.refreshError).toBe('down');
    expect(failed.data).toBe(readyState(ready).data);

    const recovered = readyState(
      dashboardReducer(failed, { type: 'received', snapshot: snapshot(), receivedAt: 2 }),
    );
    expect(recovered.refreshError).toBeNull();
  });
});
