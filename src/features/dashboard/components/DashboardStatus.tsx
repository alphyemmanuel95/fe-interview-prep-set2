import type { JSX } from 'react';
import { assertNever } from '../../../shared/assertNever';
import type { ConnectionState } from '../model/connection';
import { formatTime } from '../model/time';
import './DashboardStatus.css';

type DashboardStatusProps = Readonly<{
  connection: ConnectionState;
  intervalSeconds: number;
  updatedAt: number | null;
  error: string | null;
  canRetry: boolean;
  onRetry: () => void;
}>;

function describeConnection(connection: ConnectionState, intervalSeconds: number): string {
  switch (connection) {
    case 'live':
      return `Live · refreshes every ${intervalSeconds} seconds`;
    case 'connecting':
      return 'Connecting…';
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
  error,
  canRetry,
  onRetry,
}: DashboardStatusProps): JSX.Element {
  return (
    <div className="dashboard-status">
      {/* The single place failures are announced. Only state changes are announced; the
          timestamp ticks every poll and would be noise. */}
      <p className="dashboard-status__state" role="status">
        <span
          className={`dashboard-status__dot dashboard-status__dot--${connection}`}
          aria-hidden="true"
        />
        {describeConnection(connection, intervalSeconds)}
        {connection === 'unavailable' && error !== null && (
          <span className="dashboard-status__error"> · Last error: {error}</span>
        )}
      </p>
      {error !== null && (
        <button
          className="dashboard-status__retry"
          type="button"
          // aria-disabled rather than disabled so keyboard focus stays on the button while retrying.
          aria-disabled={!canRetry}
          onClick={() => {
            if (canRetry) {
              onRetry();
            }
          }}
        >
          {connection === 'connecting' ? 'Retrying…' : 'Retry now'}
        </button>
      )}
      {updatedAt !== null && (
        <p className="dashboard-status__updated">
          Last updated{' '}
          <time dateTime={new Date(updatedAt).toISOString()}>{formatTime(updatedAt)}</time>
        </p>
      )}
    </div>
  );
}
