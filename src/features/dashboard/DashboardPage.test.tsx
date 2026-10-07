import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type * as WidgetCardModule from './components/WidgetCard';
import { DashboardPage } from './DashboardPage';
import type { DashboardFetcher, DashboardSnapshot } from './model/types';

// Every widget renders exactly one WidgetCard, so recording card titles counts widget renders.
const { widgetRenders } = vi.hoisted(() => {
  const renders: string[] = [];
  return { widgetRenders: renders };
});

vi.mock('./components/WidgetCard', async (importOriginal) => {
  const original = await importOriginal<typeof WidgetCardModule>();
  return {
    WidgetCard: (props: Parameters<typeof original.WidgetCard>[0]) => {
      widgetRenders.push(props.title);
      return original.WidgetCard(props);
    },
  };
});

const POLL_INTERVAL_MS = 5_000;

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

async function advance(ms: number): Promise<void> {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
}

// user-event's own pauses run on timers; with fake timers they must be disabled.
// user-event's own pauses also run on timers, so skip them under fake timers.
const setupUser = (): ReturnType<typeof userEvent.setup> => userEvent.setup({ delay: null });

describe('DashboardPage', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // React Testing Library only knows how to flush Jest's fake timers: it calls
    // `jest.advanceTimersByTime` while awaiting user-event. Pointing that at Vitest's clock
    // keeps interactions working without real time passing.
    vi.stubGlobal('jest', {
      advanceTimersByTime: (ms: number) => {
        vi.advanceTimersByTime(ms);
      },
    });
    widgetRenders.length = 0;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders the three widgets from the API response', async () => {
    render(<DashboardPage fetcher={createFetcher()} />);
    expect(screen.getByRole('status')).toHaveTextContent('Connecting…');

    await advance(0);

    expect(screen.getByRole('region', { name: 'Sales' })).toHaveTextContent('$12,345.67');
    expect(screen.getByRole('region', { name: 'Active users' })).toHaveTextContent('87');
    expect(screen.getByRole('img', { name: /active users trend/i })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Recent orders' })).toHaveTextContent('Grace Hopper');
    expect(screen.getByText(/refreshes every 5 seconds/)).toBeInTheDocument();
  });

  it('re-renders only the widgets whose data changed', async () => {
    const fetcher = vi
      .fn<DashboardFetcher>()
      .mockResolvedValueOnce(structuredClone(SNAPSHOT))
      // Fresh objects with equal sales and orders, as a real JSON response would be.
      .mockResolvedValue(structuredClone({ ...SNAPSHOT, activeUsers: 90 }));
    render(<DashboardPage fetcher={fetcher} />);
    await advance(0);
    widgetRenders.length = 0;

    await advance(POLL_INTERVAL_MS);

    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(screen.getByRole('region', { name: 'Active users' })).toHaveTextContent('90');
    expect(widgetRenders).toEqual(['Active users']);
  });

  it('retries immediately after a failed first load', async () => {
    const user = setupUser();
    let resolveRetry: (snapshot: DashboardSnapshot) => void = () => undefined;
    const fetcher = vi
      .fn<DashboardFetcher>()
      .mockRejectedValueOnce(new Error('Service unavailable'))
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveRetry = resolve;
          }),
      );
    render(<DashboardPage fetcher={fetcher} />);
    await advance(0);
    expect(screen.getByRole('status')).toHaveTextContent(/Not connected.*Service unavailable/);

    await user.click(screen.getByRole('button', { name: 'Retry now' }));
    await advance(0);
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(screen.getByRole('button', { name: 'Retrying…' })).toHaveAttribute(
      'aria-disabled',
      'true',
    );

    await act(async () => {
      resolveRetry(SNAPSHOT);
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(screen.getByRole('region', { name: 'Sales' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Retr/ })).not.toBeInTheDocument();
  });

  it('stops claiming Live when a refresh fails after data loaded', async () => {
    const fetcher = vi
      .fn<DashboardFetcher>()
      .mockResolvedValueOnce(SNAPSHOT)
      .mockRejectedValue(new Error('Timeout'));
    render(<DashboardPage fetcher={fetcher} />);
    await advance(0);

    await advance(POLL_INTERVAL_MS);

    expect(screen.queryByText(/refreshes every/)).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent(/Not connected.*Timeout/);
    expect(screen.getByRole('button', { name: 'Retry now' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Sales' })).toBeInTheDocument();
  });

  it('keeps a hidden widget hidden after the page is reloaded', async () => {
    const user = setupUser();
    const { unmount } = render(<DashboardPage fetcher={createFetcher()} />);
    await advance(0);

    await user.click(screen.getByRole('checkbox', { name: 'Recent orders' }));
    expect(screen.queryByRole('region', { name: 'Recent orders' })).not.toBeInTheDocument();

    unmount();
    render(<DashboardPage fetcher={createFetcher()} />);
    await advance(0);

    expect(screen.getByRole('region', { name: 'Sales' })).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Recent orders' })).not.toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'Recent orders' })).not.toBeChecked();
  });
});
