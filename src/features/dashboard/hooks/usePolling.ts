import { useEffect, useEffectEvent } from 'react';
import { useDocumentVisibility } from './useDocumentVisibility';

type UsePollingOptions<T> = Readonly<{
  fetcher: (signal: AbortSignal) => Promise<T>;
  intervalMs: number;
  onSuccess: (data: T) => void;
  onError: (error: unknown) => void;
}>;

type UsePollingResult = Readonly<{ isPaused: boolean }>;

/**
 * Polls `fetcher` while the page is visible. Each visible period is one effect run:
 * hiding the tab runs the cleanup (abort + clear timer), showing it starts a fresh run
 * that fetches immediately.
 */
export function usePolling<T>({
  fetcher,
  intervalMs,
  onSuccess,
  onError,
}: UsePollingOptions<T>): UsePollingResult {
  const isVisible = useDocumentVisibility();
  // Effect events read the latest callbacks without making them dependencies, so a parent
  // passing new inline functions each render doesn't restart the polling loop.
  const runFetcher = useEffectEvent(fetcher);
  const handleSuccess = useEffectEvent(onSuccess);
  const handleError = useEffectEvent(onError);

  useEffect(() => {
    if (!isVisible) {
      return;
    }
    // Flipped in cleanup. A response from an earlier run (e.g. a fetcher that ignores the
    // abort signal and settles late) can then never overwrite data from the current run.
    let isCurrentRun = true;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    const controller = new AbortController();

    const poll = async (): Promise<void> => {
      try {
        const data = await runFetcher(controller.signal);
        if (isCurrentRun) {
          handleSuccess(data);
        }
      } catch (error: unknown) {
        if (isCurrentRun) {
          handleError(error);
        }
      }
      // The next request is scheduled only after this one settles (not setInterval), so a
      // slow API can never have more than one request in flight.
      if (isCurrentRun) {
        timeoutId = setTimeout(() => void poll(), intervalMs);
      }
    };

    // Deferred by a macrotask: StrictMode's mount → cleanup → mount clears this timer before it
    // fires, so development doesn't send (and immediately cancel) a duplicate first request.
    timeoutId = setTimeout(() => void poll(), 0);
    return () => {
      isCurrentRun = false;
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, [isVisible, intervalMs]);

  return { isPaused: !isVisible };
}
