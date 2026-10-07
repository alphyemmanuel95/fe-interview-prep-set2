import { describe, expect, it } from 'vitest';
import { appendUniquePosts, feedReducer, initialFeedState } from './feedReducer';
import type { Post } from './post';

const makePost = (id: number): Post => ({
  id,
  title: `Post ${id}`,
  body: 'Body',
  tags: [],
  likes: 0,
  dislikes: 0,
  views: 0,
});

describe('appendUniquePosts', () => {
  it('drops posts whose id is already present', () => {
    const merged = appendUniquePosts([makePost(1), makePost(2)], [makePost(2), makePost(3)]);
    expect(merged.map((post) => post.id)).toEqual([1, 2, 3]);
  });
});

describe('feedReducer', () => {
  it('advances the cursor and returns to idle after a middle page', () => {
    const loading = feedReducer(initialFeedState, { type: 'pageRequested' });
    const state = feedReducer(loading, {
      type: 'pageLoaded',
      page: { posts: [makePost(1), makePost(2)], skip: 0, total: 5 },
    });
    expect(state.nextSkip).toBe(2);
    expect(state.phase).toEqual({ status: 'idle' });
  });

  it('marks the feed done once the last page arrives', () => {
    const state = feedReducer(initialFeedState, {
      type: 'pageLoaded',
      page: { posts: [makePost(1)], skip: 0, total: 1 },
    });
    expect(state.phase).toEqual({ status: 'done' });
  });

  it('keeps loaded posts when a page fails', () => {
    const loaded = feedReducer(initialFeedState, {
      type: 'pageLoaded',
      page: { posts: [makePost(1)], skip: 0, total: 3 },
    });
    const failed = feedReducer(loaded, { type: 'pageFailed', error: 'Offline' });
    expect(failed.posts).toHaveLength(1);
    expect(failed.phase).toEqual({ status: 'error', error: 'Offline' });
  });

  it('returns to idle when an in-flight request is cancelled', () => {
    const loading = feedReducer(initialFeedState, { type: 'pageRequested' });
    expect(feedReducer(loading, { type: 'pageCancelled' }).phase).toEqual({ status: 'idle' });
  });
});
