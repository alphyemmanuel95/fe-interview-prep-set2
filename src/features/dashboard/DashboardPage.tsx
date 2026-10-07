import type { JSX } from 'react';
import { assertNever } from '../../shared/assertNever';
import { fetchDashboard } from './api/fetchDashboard';
import { ActiveUsersWidget } from './components/ActiveUsersWidget';
import { DashboardStatus } from './components/DashboardStatus';
import { RecentOrdersWidget } from './components/RecentOrdersWidget';
import { SalesWidget } from './components/SalesWidget';
import { WidgetToggles } from './components/WidgetToggles';
import { useDashboard } from './hooks/useDashboard';
import { useWidgetVisibility } from './hooks/useWidgetVisibility';
import type { DashboardData, DashboardState } from './model/dashboardReducer';
import type { DashboardFetcher } from './model/types';
import { WIDGET_IDS, type WidgetId } from './model/widgets';
import './DashboardPage.css';

type DashboardPageProps = Readonly<{
  /** Injected in tests; the route renders the real HTTP client. */
  fetcher?: DashboardFetcher;
}>;

type WidgetGridProps = Readonly<{
  data: DashboardData;
  hiddenWidgetIds: readonly WidgetId[];
}>;

function WidgetGrid({ data, hiddenWidgetIds }: WidgetGridProps): JSX.Element {
  const isShown = (id: WidgetId): boolean => !hiddenWidgetIds.includes(id);
  if (!WIDGET_IDS.some(isShown)) {
    return <p className="dashboard__message">All widgets are hidden. Pick some above.</p>;
  }
  // Each widget receives only its own slice, so its memo boundary sees unchanged props
  // whenever the reducer kept that slice's reference.
  return (
    <div className="dashboard__grid">
      {isShown('sales') && <SalesWidget sales={data.sales} />}
      {isShown('activeUsers') && <ActiveUsersWidget history={data.activeUsersHistory} />}
      {isShown('recentOrders') && (
        <RecentOrdersWidget orders={data.recentOrders} currency={data.sales.currency} />
      )}
    </div>
  );
}

type DashboardContentProps = Readonly<{
  state: DashboardState;
  hiddenWidgetIds: readonly WidgetId[];
}>;

function DashboardContent({ state, hiddenWidgetIds }: DashboardContentProps): JSX.Element {
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
      return <WidgetGrid data={state.data} hiddenWidgetIds={hiddenWidgetIds} />;
    default:
      return assertNever(state);
  }
}

export function DashboardPage({ fetcher = fetchDashboard }: DashboardPageProps): JSX.Element {
  const { state, isPaused } = useDashboard(fetcher);
  const { hiddenWidgetIds, toggleWidget } = useWidgetVisibility();
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
      <WidgetToggles hiddenWidgetIds={hiddenWidgetIds} onToggle={toggleWidget} />
      <DashboardContent state={state} hiddenWidgetIds={hiddenWidgetIds} />
    </section>
  );
}
