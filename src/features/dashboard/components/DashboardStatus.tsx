import type { JSX } from 'react';
import './DashboardStatus.css';

type DashboardStatusProps = Readonly<{
  isPaused: boolean;
  updatedAt: number | null;
  refreshError: string | null;
}>;

const timeFormatter = new Intl.DateTimeFormat(undefined, { timeStyle: 'medium' });

export function DashboardStatus({
  isPaused,
  updatedAt,
  refreshError,
}: DashboardStatusProps): JSX.Element {
  return (
    <div className="dashboard-status">
      {/* Only state changes are announced; the timestamp ticks every 5s and would be noise. */}
      <p className="dashboard-status__state" aria-live="polite">
        <span
          className={isPaused ? 'dashboard-status__dot--paused' : 'dashboard-status__dot--live'}
          aria-hidden="true"
        />
        {isPaused ? 'Paused while this tab is hidden' : 'Live · refreshes every 5 seconds'}
        {refreshError !== null && (
          <span className="dashboard-status__error"> · Refresh failed: {refreshError}</span>
        )}
      </p>
      {updatedAt !== null && (
        <p className="dashboard-status__updated">
          Last updated{' '}
          <time dateTime={new Date(updatedAt).toISOString()}>
            {timeFormatter.format(updatedAt)}
          </time>
        </p>
      )}
    </div>
  );
}
