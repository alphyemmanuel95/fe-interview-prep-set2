import { memo, type JSX } from 'react';
import { formatCents } from '../model/money';
import type { Sales } from '../model/types';
import { WIDGET_LABELS } from '../model/widgets';
import { WidgetCard } from './WidgetCard';
import './SalesWidget.css';

type SalesWidgetProps = Readonly<{ sales: Sales }>;

// Memoized: the reducer keeps the same `sales` reference when the value is unchanged, so this
// widget skips re-rendering on polls that only changed other widgets.
export const SalesWidget = memo(function SalesWidget({ sales }: SalesWidgetProps): JSX.Element {
  return (
    <WidgetCard title={WIDGET_LABELS.sales}>
      <p className="sales-widget__value">{formatCents(sales.totalCents, sales.currency)}</p>
      <p className="sales-widget__caption">Total revenue today</p>
    </WidgetCard>
  );
});
