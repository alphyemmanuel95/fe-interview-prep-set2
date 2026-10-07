import type { DashboardState } from './dashboardReducer';

export type ConnectionState = 'live' | 'paused' | 'unavailable';

export function getConnectionState(isPaused: boolean, state: DashboardState): ConnectionState {
  if (isPaused) {
    return 'paused';
  }
  return state.status === 'error' ? 'unavailable' : 'live';
}
