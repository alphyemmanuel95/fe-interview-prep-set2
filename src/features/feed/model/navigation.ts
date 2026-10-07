// Marks history entries pushed from the feed, so the detail page's back link can pop history
// (restoring the saved scroll position) instead of pushing a fresh /feed entry that starts at the top.
export const feedLocationState = { fromFeed: true } as const;

export const isFromFeed = (state: unknown): boolean =>
  typeof state === 'object' && state !== null && 'fromFeed' in state && state.fromFeed === true;
