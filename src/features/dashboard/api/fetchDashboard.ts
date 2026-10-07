import type { DashboardSnapshot } from '../model/types';
import { isDashboardSnapshot } from './isDashboardSnapshot';

const DASHBOARD_ENDPOINT = '/api/dashboard';

export async function fetchDashboard(signal: AbortSignal): Promise<DashboardSnapshot> {
  const response = await fetch(DASHBOARD_ENDPOINT, { signal, cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`Dashboard request failed (HTTP ${response.status})`);
  }
  const body: unknown = await response.json();
  if (!isDashboardSnapshot(body)) {
    throw new Error('Dashboard response had an unexpected shape');
  }
  return body;
}
