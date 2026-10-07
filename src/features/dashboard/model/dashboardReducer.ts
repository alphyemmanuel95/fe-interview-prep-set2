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
  // `isRetrying` keeps the last error visible while a manual retry is in flight.
  | Readonly<{ status: 'error'; error: string; isRetrying: boolean }>
  | Readonly<{
      status: 'ready';
      data: DashboardData;
      refreshError: string | null;
      isRetrying: boolean;
    }>;

export type DashboardAction =
  | Readonly<{ type: 'received'; snapshot: DashboardSnapshot; receivedAt: number }>
  | Readonly<{ type: 'failed'; error: string }>
  | Readonly<{ type: 'retryStarted' }>;

export const initialDashboardState: DashboardState = { status: 'loading' };

const isSameSales = (a: Sales, b: Sales): boolean =>
  a.totalCents === b.totalCents && a.currency === b.currency;

const isSameOrder = (a: Order, b: Order): boolean =>
  a.id === b.id &&
  a.customer === b.customer &&
  a.amountCents === b.amountCents &&
  a.createdAt === b.createdAt;

const isSameOrders = (a: readonly Order[], b: readonly Order[]): boolean =>
  a.length === b.length &&
  a.every((order, index) => {
    const other = b[index];
    return other !== undefined && isSameOrder(order, other);
  });

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
    // A rolling time series: every reading is new data, so this slice (and its chart) changes
    // on every poll by design. Only sales and orders can legitimately stay the same.
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
        isRetrying: false,
      };
    }
    case 'failed':
      // Once data is on screen a failed refresh keeps it and only reports the error.
      return state.status === 'ready'
        ? { ...state, refreshError: action.error, isRetrying: false }
        : { status: 'error', error: action.error, isRetrying: false };
    case 'retryStarted':
      return state.status === 'loading' ? state : { ...state, isRetrying: true };
    default:
      return assertNever(action);
  }
}
