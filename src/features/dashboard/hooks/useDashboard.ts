import { useReducer } from 'react';
import {
  dashboardReducer,
  initialDashboardState,
  type DashboardState,
} from '../model/dashboardReducer';
import type { DashboardFetcher } from '../model/types';
import { usePolling } from './usePolling';

export const POLL_INTERVAL_MS = 5_000;

type UseDashboardResult = Readonly<{ state: DashboardState; isPaused: boolean }>;

const toMessage = (error: unknown): string =>
  error instanceof Error ? error.message : 'Unknown error';

export function useDashboard(fetcher: DashboardFetcher): UseDashboardResult {
  const [state, dispatch] = useReducer(dashboardReducer, initialDashboardState);
  const { isPaused } = usePolling({
    fetcher,
    intervalMs: POLL_INTERVAL_MS,
    onSuccess: (snapshot) => {
      dispatch({ type: 'received', snapshot, receivedAt: Date.now() });
    },
    onError: (error) => {
      dispatch({ type: 'failed', error: toMessage(error) });
    },
  });
  return { state, isPaused };
}
