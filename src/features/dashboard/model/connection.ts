import { assertNever } from '../../../shared/assertNever';
import type { DashboardState } from './dashboardReducer';

export type ConnectionState = 'live' | 'paused' | 'connecting' | 'unavailable';

export function getConnectionState(isPaused: boolean, state: DashboardState): ConnectionState {
  if (isPaused) {
    return 'paused';
  }
  switch (state.status) {
    case 'loading':
      return 'connecting';
    case 'error':
      return state.isRetrying ? 'connecting' : 'unavailable';
    case 'ready':
      if (state.isRetrying) {
        return 'connecting';
      }
      // Data on screen but the latest refresh failed: it is stale, so never claim "Live".
      return state.refreshError === null ? 'live' : 'unavailable';
    default:
      return assertNever(state);
  }
}
