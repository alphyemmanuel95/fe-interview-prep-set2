import { useCallback, useEffect, useRef, useSyncExternalStore } from 'react';
import { fetchPostsPage, toErrorMessage } from '../api/postsApi';
import type { FeedPhase } from '../model/feedReducer';
import type { FeedStore } from '../model/feedStore';
import type { Post } from '../model/post';

export type InfinitePosts = Readonly<{
  posts: readonly Post[];
  phase: FeedPhase;
  loadNextPage: () => void;
  retry: () => void;
}>;

export function useInfinitePosts(store: FeedStore): InfinitePosts {
  const { posts, phase } = useSyncExternalStore(store.subscribe, store.getState);
  // Duplicate requests are stopped first by `loadNextPage`, which reads the phase synchronously
  // from the external store: the first call flips it to 'loading' before the next call runs, which
  // React state could not do until a re-render. This ref's main job is holding the AbortController
  // so leaving mid-request can cancel it. It also acts as a second, independent in-flight guard.
  const inFlightRef = useRef<AbortController | null>(null);

  const fetchNextPage = useCallback(async (): Promise<void> => {
    if (inFlightRef.current) {
      return;
    }
    const controller = new AbortController();
    inFlightRef.current = controller;
    store.dispatch({ type: 'pageRequested' });
    try {
      const page = await fetchPostsPage(store.getState().nextSkip, controller.signal);
      store.dispatch({ type: 'pageLoaded', page });
    } catch (error: unknown) {
      store.dispatch(
        controller.signal.aborted
          ? { type: 'pageCancelled' }
          : { type: 'pageFailed', error: toErrorMessage(error) },
      );
    } finally {
      inFlightRef.current = null;
    }
  }, [store]);

  const loadNextPage = useCallback(() => {
    // Errors wait for an explicit Retry so a failing API is not hammered on every scroll.
    if (store.getState().phase.status === 'idle') {
      void fetchNextPage();
    }
  }, [store, fetchNextPage]);

  const retry = useCallback(() => {
    if (store.getState().phase.status === 'error') {
      void fetchNextPage();
    }
  }, [store, fetchNextPage]);

  // Leaving mid-request aborts it; the store drops back to idle so the next visit resumes cleanly.
  useEffect(() => {
    const inFlight = inFlightRef;
    return () => {
      inFlight.current?.abort();
    };
  }, []);

  return { posts, phase, loadNextPage, retry };
}
