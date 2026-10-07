import { assertNever } from '../../../shared/assertNever';
import type { Post, PostsPage } from './post';

export type FeedPhase =
  | { readonly status: 'idle' }
  | { readonly status: 'loading' }
  | { readonly status: 'error'; readonly error: string }
  | { readonly status: 'done' };

export type FeedState = Readonly<{
  posts: readonly Post[];
  nextSkip: number;
  phase: FeedPhase;
}>;

export type FeedAction =
  | { readonly type: 'pageRequested' }
  | { readonly type: 'pageLoaded'; readonly page: PostsPage }
  | { readonly type: 'pageFailed'; readonly error: string }
  | { readonly type: 'pageCancelled' };

export const initialFeedState: FeedState = { posts: [], nextSkip: 0, phase: { status: 'idle' } };

// Belt and braces next to the in-flight guard: if the backing list shifts between pages
// (a post inserted upstream), the same id can arrive twice and would break React keys.
export function appendUniquePosts(
  current: readonly Post[],
  incoming: readonly Post[],
): readonly Post[] {
  const seenIds = new Set(current.map((post) => post.id));
  const fresh = incoming.filter((post) => {
    if (seenIds.has(post.id)) {
      return false;
    }
    seenIds.add(post.id);
    return true;
  });
  return fresh.length === 0 ? current : [...current, ...fresh];
}

export function feedReducer(state: FeedState, action: FeedAction): FeedState {
  switch (action.type) {
    case 'pageRequested':
      return { ...state, phase: { status: 'loading' } };
    case 'pageLoaded': {
      const { page } = action;
      const nextSkip = page.skip + page.posts.length;
      const isLastPage = page.posts.length === 0 || nextSkip >= page.total;
      return {
        posts: appendUniquePosts(state.posts, page.posts),
        nextSkip,
        phase: isLastPage ? { status: 'done' } : { status: 'idle' },
      };
    }
    case 'pageFailed':
      return { ...state, phase: { status: 'error', error: action.error } };
    case 'pageCancelled':
      return state.phase.status === 'loading' ? { ...state, phase: { status: 'idle' } } : state;
    default:
      return assertNever(action);
  }
}
