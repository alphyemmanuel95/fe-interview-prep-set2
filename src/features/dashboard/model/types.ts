export type Order = Readonly<{
  id: string;
  customer: string;
  amountCents: number;
  createdAt: string;
}>;

export type Sales = Readonly<{
  totalCents: number;
  currency: string;
}>;

/** One response from `GET /api/dashboard`. */
export type DashboardSnapshot = Readonly<{
  sales: Sales;
  activeUsers: number;
  recentOrders: readonly Order[];
}>;

export type DashboardFetcher = (signal: AbortSignal) => Promise<DashboardSnapshot>;
