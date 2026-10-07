import { assertNever } from '../../../shared/assertNever';
import type { DashboardSnapshot, Order, Sales } from './types';

export const ACTIVE_USERS_HISTORY_LENGTH = 20;

export type DashboardData = Readonly<{
  sales: Sales;
  activeUsersHistory: readonly number[];
  recentOrders: readonly Order[];
  updatedAt: number;
}>;

export type DashboardState =
  | Readonly<{ status: 'loading' }>
  | Readonly<{ status: 'error'; error: string }>
  | Readonly<{ status: 'ready'; data: DashboardData; refreshError: string | null }>;

export type DashboardAction =
  | Readonly<{ type: 'received'; snapshot: DashboardSnapshot; receivedAt: number }>
  | Readonly<{ type: 'failed'; error: string }>;

export const initialDashboardState: DashboardState = { status: 'loading' };

const isSameSales = (a: Sales, b: Sales): boolean =>
  a.totalCents === b.totalCents && a.currency === b.currency;

// Orders are immutable once created, so comparing ids in order is a sufficient equality check.
const isSameOrders = (a: readonly Order[], b: readonly Order[]): boolean =>
  a.length === b.length && a.every((order, index) => order.id === b[index]?.id);

// Every response is freshly parsed JSON, so every slice is a new object even when nothing
// changed. Reusing the previous reference for equal slices is what lets the memoized widgets
// skip re-rendering: the spec requires unchanged widgets not to re-render.
function mergeSnapshot(
  previous: DashboardData | null,
  snapshot: DashboardSnapshot,
  receivedAt: number,
): DashboardData {
  const history = previous?.activeUsersHistory ?? [];
  return {
    sales:
      previous !== null && isSameSales(previous.sales, snapshot.sales)
        ? previous.sales
        : snapshot.sales,
    recentOrders:
      previous !== null && isSameOrders(previous.recentOrders, snapshot.recentOrders)
        ? previous.recentOrders
        : snapshot.recentOrders,
    activeUsersHistory: [...history, snapshot.activeUsers].slice(-ACTIVE_USERS_HISTORY_LENGTH),
    updatedAt: receivedAt,
  };
}

export function dashboardReducer(state: DashboardState, action: DashboardAction): DashboardState {
  switch (action.type) {
    case 'received': {
      const previous = state.status === 'ready' ? state.data : null;
      return {
        status: 'ready',
        data: mergeSnapshot(previous, action.snapshot, action.receivedAt),
        refreshError: null,
      };
    }
    case 'failed':
      // Once data is on screen a failed refresh keeps it and only reports the error.
      return state.status === 'ready'
        ? { ...state, refreshError: action.error }
        : { status: 'error', error: action.error };
    default:
      return assertNever(action);
  }
}
