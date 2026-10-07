import { memo, useId, type JSX } from 'react';
import { toSparklinePoints } from '../model/sparkline';
import { WIDGET_LABELS } from '../model/widgets';
import { WidgetCard } from './WidgetCard';
import './ActiveUsersWidget.css';

type ActiveUsersWidgetProps = Readonly<{ history: readonly number[] }>;

const CHART_WIDTH = 300;
const CHART_HEIGHT = 80;
// Keeps the stroke and end dot inside the viewBox at the extremes.
const CHART_PADDING = 4;
const DOT_RADIUS = 3;

// Memoized so it re-renders only when a new history array arrives, not on unrelated updates.
export const ActiveUsersWidget = memo(function ActiveUsersWidget({
  history,
}: ActiveUsersWidgetProps): JSX.Element {
  const titleId = useId();
  const descriptionId = useId();
  const points = toSparklinePoints(
    history,
    CHART_WIDTH - CHART_PADDING * 2,
    CHART_HEIGHT - CHART_PADDING * 2,
  );
  const lastPoint = points.at(-1);
  const current = history.at(-1);
  const polylinePoints = points
    .map(({ x, y }) => `${x + CHART_PADDING},${y + CHART_PADDING}`)
    .join(' ');

  return (
    <WidgetCard title={WIDGET_LABELS.activeUsers}>
      <p className="active-users-widget__value">{current ?? '—'}</p>
      <p className="active-users-widget__caption">online now</p>
      <svg
        className="active-users-widget__chart"
        viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
        role="img"
        aria-labelledby={`${titleId} ${descriptionId}`}
      >
        <title id={titleId}>Active users trend</title>
        <desc id={descriptionId}>
          {`Last ${history.length} readings, from ${history.at(0) ?? 0} to ${current ?? 0}.`}
        </desc>
        <polyline className="active-users-widget__line" points={polylinePoints} />
        {lastPoint !== undefined && (
          <circle
            className="active-users-widget__dot"
            cx={lastPoint.x + CHART_PADDING}
            cy={lastPoint.y + CHART_PADDING}
            r={DOT_RADIUS}
          />
        )}
      </svg>
    </WidgetCard>
  );
});
