import type { JSX } from 'react';
import { assertNever } from '../../shared/assertNever';
import { fetchDashboard } from './api/fetchDashboard';
import { ActiveUsersWidget } from './components/ActiveUsersWidget';
import { DashboardStatus } from './components/DashboardStatus';
import { RecentOrdersWidget } from './components/RecentOrdersWidget';
import { SalesWidget } from './components/SalesWidget';
import { useDashboard } from './hooks/useDashboard';
import type { DashboardData, DashboardState } from './model/dashboardReducer';
import type { DashboardFetcher } from './model/types';
import './DashboardPage.css';

type DashboardPageProps = Readonly<{
  /** Injected in tests; the route renders the real HTTP client. */
  fetcher?: DashboardFetcher;
}>;

function WidgetGrid({ data }: Readonly<{ data: DashboardData }>): JSX.Element {
  // Each widget receives only its own slice, so its memo boundary sees unchanged props
  // whenever the reducer kept that slice's reference.
  return (
    <div className="dashboard__grid">
      <SalesWidget sales={data.sales} />
      <ActiveUsersWidget history={data.activeUsersHistory} />
      <RecentOrdersWidget orders={data.recentOrders} currency={data.sales.currency} />
    </div>
  );
}

function DashboardContent({ state }: Readonly<{ state: DashboardState }>): JSX.Element {
  switch (state.status) {
    case 'loading':
      return <p className="dashboard__message">Loading dashboard…</p>;
    case 'error':
      return (
        <p className="dashboard__message dashboard__message--error" role="alert">
          Could not load the dashboard: {state.error}. Retrying automatically.
        </p>
      );
    case 'ready':
      return <WidgetGrid data={state.data} />;
    default:
      return assertNever(state);
  }
}

export function DashboardPage({ fetcher = fetchDashboard }: DashboardPageProps): JSX.Element {
  const { state, isPaused } = useDashboard(fetcher);
  return (
    <section className="dashboard" aria-labelledby="page-title">
      <h1 className="dashboard__title" id="page-title">
        Live Dashboard
      </h1>
      <DashboardStatus
        isPaused={isPaused}
        updatedAt={state.status === 'ready' ? state.data.updatedAt : null}
        refreshError={state.status === 'ready' ? state.refreshError : null}
      />
      <DashboardContent state={state} />
    </section>
  );
}
