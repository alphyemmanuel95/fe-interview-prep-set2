import { act, renderHook } from '@testing-library/react';
import { StrictMode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { usePolling } from './usePolling';

const INTERVAL_MS = 5_000;

type Deferred<T> = Readonly<{
  resolve: (value: T) => void;
  signal: AbortSignal;
}>;

/** A fetcher whose calls stay pending until the test resolves them, recording each call. */
function createControlledFetcher<T>(): Readonly<{
  fetcher: (signal: AbortSignal) => Promise<T>;
  calls: Deferred<T>[];
}> {
  const calls: Deferred<T>[] = [];
  const fetcher = (signal: AbortSignal): Promise<T> =>
    new Promise<T>((resolve) => {
      calls.push({ resolve, signal });
    });
  return { fetcher, calls };
}

let visibility: DocumentVisibilityState = 'visible';

async function setVisibility(next: DocumentVisibilityState): Promise<void> {
  visibility = next;
  await act(async () => {
    document.dispatchEvent(new Event('visibilitychange'));
    await vi.advanceTimersByTimeAsync(0);
  });
}

async function advance(ms: number): Promise<void> {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
}

async function settle<T>(call: Deferred<T> | undefined, value: T): Promise<void> {
  await act(async () => {
    call?.resolve(value);
    await vi.advanceTimersByTimeAsync(0);
  });
}

function renderPolling<T>(fetcher: (signal: AbortSignal) => Promise<T>) {
  const onSuccess = vi.fn<(data: T) => void>();
  const onError = vi.fn<(error: unknown) => void>();
  const view = renderHook(() =>
    usePolling({ fetcher, intervalMs: INTERVAL_MS, onSuccess, onError }),
  );
  return { ...view, onSuccess, onError };
}

describe('usePolling', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    visibility = 'visible';
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      get: () => visibility,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('polls again five seconds after each response settles', async () => {
    const { fetcher, calls } = createControlledFetcher<number>();
    const { onSuccess } = renderPolling(fetcher);
    await advance(0);
    expect(calls).toHaveLength(1);

    await settle(calls[0], 1);
    await advance(INTERVAL_MS);

    expect(onSuccess).toHaveBeenCalledWith(1);
    expect(calls).toHaveLength(2);
  });

  it('sends exactly one request on mount under StrictMode', async () => {
    const { fetcher, calls } = createControlledFetcher<number>();
    renderHook(
      () => usePolling({ fetcher, intervalMs: INTERVAL_MS, onSuccess: vi.fn(), onError: vi.fn() }),
      { wrapper: StrictMode },
    );

    await advance(0);

    expect(calls).toHaveLength(1);
    expect(calls[0]?.signal.aborted).toBe(false);
  });

  it('never overlaps requests when the API is slower than the interval', async () => {
    const { fetcher, calls } = createControlledFetcher<number>();
    renderPolling(fetcher);

    await advance(INTERVAL_MS * 4);
    expect(calls).toHaveLength(1);

    await settle(calls[0], 1);
    await advance(INTERVAL_MS);
    expect(calls).toHaveLength(2);
  });

  it('stops requesting while the tab is hidden and resumes immediately when visible', async () => {
    const { fetcher, calls } = createControlledFetcher<number>();
    const { result } = renderPolling(fetcher);
    await advance(0);
    await settle(calls[0], 1);
    await advance(INTERVAL_MS);
    expect(calls).toHaveLength(2);

    await setVisibility('hidden');
    expect(calls[1]?.signal.aborted).toBe(true);
    expect(result.current.isPaused).toBe(true);

    await advance(INTERVAL_MS * 4);
    expect(calls).toHaveLength(2);

    await setVisibility('visible');
    expect(result.current.isPaused).toBe(false);
    expect(calls).toHaveLength(3);
  });

  it('ignores a late response from before the tab was hidden', async () => {
    const { fetcher, calls } = createControlledFetcher<string>();
    const { onSuccess } = renderPolling(fetcher);
    await advance(0);

    await setVisibility('hidden');
    await setVisibility('visible');
    await settle(calls[1], 'newer');
    // The first call ignored its abort signal and only now resolves.
    await settle(calls[0], 'older');

    expect(onSuccess).toHaveBeenCalledTimes(1);
    expect(onSuccess).toHaveBeenLastCalledWith('newer');
  });

  it('reports failures and keeps polling', async () => {
    const fetcher = vi.fn<(signal: AbortSignal) => Promise<number>>();
    fetcher.mockRejectedValueOnce(new Error('boom')).mockResolvedValue(2);
    const { onError, onSuccess } = renderPolling(fetcher);
    await advance(0);
    expect(onError).toHaveBeenCalledWith(new Error('boom'));

    await advance(INTERVAL_MS);
    expect(onSuccess).toHaveBeenCalledWith(2);
  });

  it('refresh aborts the pending request and fetches immediately', async () => {
    const { fetcher, calls } = createControlledFetcher<number>();
    const { result } = renderPolling(fetcher);
    await advance(0);

    act(() => {
      result.current.refresh();
    });
    await advance(0);

    expect(calls).toHaveLength(2);
    expect(calls[0]?.signal.aborted).toBe(true);
  });

  it('aborts the in-flight request on unmount', async () => {
    const { fetcher, calls } = createControlledFetcher<number>();
    const { unmount } = renderPolling(fetcher);
    await advance(0);

    unmount();

    expect(calls[0]?.signal.aborted).toBe(true);
  });
});
