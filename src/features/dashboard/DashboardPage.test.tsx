import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { DashboardPage } from './DashboardPage';
import type { DashboardFetcher, DashboardSnapshot } from './model/types';

const SNAPSHOT: DashboardSnapshot = {
  sales: { totalCents: 1_234_567, currency: 'USD' },
  activeUsers: 87,
  recentOrders: [
    {
      id: 'ORD-7',
      customer: 'Grace Hopper',
      amountCents: 4_200,
      createdAt: '2026-01-01T10:00:00Z',
    },
  ],
};

const createFetcher = (): DashboardFetcher => vi.fn<DashboardFetcher>().mockResolvedValue(SNAPSHOT);

describe('DashboardPage', () => {
  it('renders the three widgets from the API response', async () => {
    render(<DashboardPage fetcher={createFetcher()} />);

    expect(await screen.findByRole('region', { name: 'Sales' })).toHaveTextContent('$12,345.67');
    expect(screen.getByRole('region', { name: 'Active users' })).toHaveTextContent('87');
    expect(screen.getByRole('img', { name: /active users trend/i })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Recent orders' })).toHaveTextContent('Grace Hopper');
    expect(screen.getByText(/refreshes every 5 seconds/)).toBeInTheDocument();
  });

  it('keeps a hidden widget hidden after the page is reloaded', async () => {
    const user = userEvent.setup();
    const { unmount } = render(<DashboardPage fetcher={createFetcher()} />);
    await screen.findByRole('region', { name: 'Recent orders' });

    await user.click(screen.getByRole('checkbox', { name: 'Recent orders' }));
    expect(screen.queryByRole('region', { name: 'Recent orders' })).not.toBeInTheDocument();

    unmount();
    render(<DashboardPage fetcher={createFetcher()} />);

    await screen.findByRole('region', { name: 'Sales' });
    expect(screen.queryByRole('region', { name: 'Recent orders' })).not.toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'Recent orders' })).not.toBeChecked();
  });
});
