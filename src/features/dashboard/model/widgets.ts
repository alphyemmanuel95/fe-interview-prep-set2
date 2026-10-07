export const WIDGET_IDS = ['sales', 'activeUsers', 'recentOrders'] as const;

export type WidgetId = (typeof WIDGET_IDS)[number];

export const WIDGET_LABELS = {
  sales: 'Sales',
  activeUsers: 'Active users',
  recentOrders: 'Recent orders',
} as const satisfies Record<WidgetId, string>;

export const isWidgetId = (value: unknown): value is WidgetId =>
  WIDGET_IDS.some((id) => id === value);

export const isWidgetIdList = (value: unknown): value is readonly WidgetId[] =>
  Array.isArray(value) && value.every(isWidgetId);
