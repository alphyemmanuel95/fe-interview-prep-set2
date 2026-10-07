import { memo, type JSX } from 'react';
import { formatCents } from '../model/money';
import type { Order } from '../model/types';
import { WIDGET_LABELS } from '../model/widgets';
import { WidgetCard } from './WidgetCard';
import './RecentOrdersWidget.css';

type RecentOrdersWidgetProps = Readonly<{
  orders: readonly Order[];
  currency: string;
}>;

const timeFormatter = new Intl.DateTimeFormat(undefined, { timeStyle: 'medium' });

// Memoized: the reducer reuses the same `orders` array when no new order arrived, and
// `currency` is a primitive, so polls that only change other widgets skip this one.
export const RecentOrdersWidget = memo(function RecentOrdersWidget({
  orders,
  currency,
}: RecentOrdersWidgetProps): JSX.Element {
  return (
    <WidgetCard title={WIDGET_LABELS.recentOrders}>
      {orders.length === 0 ? (
        <p className="recent-orders-widget__empty">No orders yet.</p>
      ) : (
        <ul className="recent-orders-widget__list">
          {orders.map((order) => (
            <li className="recent-orders-widget__item" key={order.id}>
              <span className="recent-orders-widget__customer">{order.customer}</span>
              <span className="recent-orders-widget__amount">
                {formatCents(order.amountCents, currency)}
              </span>
              <span className="recent-orders-widget__meta">
                {order.id} ·{' '}
                <time dateTime={order.createdAt}>
                  {timeFormatter.format(new Date(order.createdAt))}
                </time>
              </span>
            </li>
          ))}
        </ul>
      )}
    </WidgetCard>
  );
});
