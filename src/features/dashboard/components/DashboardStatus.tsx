import type { JSX } from 'react';
import { assertNever } from '../../../shared/assertNever';
import type { ConnectionState } from '../model/connection';
import { formatTime } from '../model/time';
import './DashboardStatus.css';

type DashboardStatusProps = Readonly<{
  connection: ConnectionState;
  intervalSeconds: number;
  updatedAt: number | null;
  refreshError: string | null;
}>;

function describeConnection(connection: ConnectionState, intervalSeconds: number): string {
  switch (connection) {
    case 'live':
      return `Live · refreshes every ${intervalSeconds} seconds`;
    case 'paused':
      return 'Paused while this tab is hidden';
    case 'unavailable':
      return `Not connected · retrying every ${intervalSeconds} seconds`;
    default:
      return assertNever(connection);
  }
}

export function DashboardStatus({
  connection,
  intervalSeconds,
  updatedAt,
  refreshError,
}: DashboardStatusProps): JSX.Element {
  return (
    <div className="dashboard-status">
      {/* Only state changes are announced; the timestamp ticks every poll and would be noise. */}
      <p className="dashboard-status__state" aria-live="polite">
        <span
          className={`dashboard-status__dot dashboard-status__dot--${connection}`}
          aria-hidden="true"
        />
        {describeConnection(connection, intervalSeconds)}
        {refreshError !== null && (
          <span className="dashboard-status__error"> · Refresh failed: {refreshError}</span>
        )}
      </p>
      {updatedAt !== null && (
        <p className="dashboard-status__updated">
          Last updated{' '}
          <time dateTime={new Date(updatedAt).toISOString()}>{formatTime(updatedAt)}</time>
        </p>
      )}
    </div>
  );
}
