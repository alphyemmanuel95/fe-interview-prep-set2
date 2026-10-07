import { memo, type JSX } from 'react';
import type { Sales } from '../model/types';
import { WIDGET_LABELS } from '../model/widgets';
import { WidgetCard } from './WidgetCard';
import './SalesWidget.css';

type SalesWidgetProps = Readonly<{ sales: Sales }>;

const CENTS_PER_UNIT = 100;

// Memoized: the reducer keeps the same `sales` reference when the value is unchanged, so this
// widget skips re-rendering on polls that only changed other widgets.
export const SalesWidget = memo(function SalesWidget({ sales }: SalesWidgetProps): JSX.Element {
  const formatter = new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: sales.currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return (
    <WidgetCard title={WIDGET_LABELS.sales}>
      <p className="sales-widget__value">{formatter.format(sales.totalCents / CENTS_PER_UNIT)}</p>
      <p className="sales-widget__caption">Total revenue today</p>
    </WidgetCard>
  );
});
