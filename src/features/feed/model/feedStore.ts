import { feedReducer, initialFeedState } from './feedReducer';
import type { FeedAction, FeedState } from './feedReducer';

export type FeedStore = Readonly<{
  getState: () => FeedState;
  dispatch: (action: FeedAction) => void;
  subscribe: (listener: () => void) => () => void;
}>;

// A tiny external store instead of `useReducer`: the list route unmounts when a post is opened,
// which would throw away every loaded page. Keeping the state outside React means going back
// renders the full list synchronously, so ScrollRestoration has the same page height to restore into.
// Reads via `getState()` are also always current, so async code never sees a stale closure.
export function createFeedStore(initialState: FeedState = initialFeedState): FeedStore {
  let state = initialState;
  const listeners = new Set<() => void>();

  return {
    getState: () => state,
    dispatch: (action) => {
      state = feedReducer(state, action);
      listeners.forEach((listener) => {
        listener();
      });
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}

export const feedStore = createFeedStore();
