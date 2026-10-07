import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import { fetchPost } from '../api/postsApi';
import type { FeedStore } from '../model/feedStore';
import type { Post } from '../model/post';

export type PostResult =
  | { readonly status: 'loading' }
  | { readonly status: 'error' }
  | { readonly status: 'notFound' }
  | { readonly status: 'success'; readonly post: Post };

export type PostQuery = Readonly<{ result: PostResult; retry: () => void }>;

// `postId` is null when the URL segment is not a valid id; that is a not-found, not a fetch.
// Callers key the consumer by `postId`, so this state never outlives the post it belongs to.
export function usePost(postId: number | null, store: FeedStore): PostQuery {
  // A post already loaded by the feed renders instantly; only deep links hit the network.
  const cachedPost = useSyncExternalStore(store.subscribe, () =>
    store.getState().posts.find((post) => post.id === postId),
  );
  const hasCachedPost = cachedPost !== undefined;
  const [fetched, setFetched] = useState<PostResult>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (postId === null || hasCachedPost) {
      return undefined;
    }
    const controller = new AbortController();
    fetchPost(postId, controller.signal).then(
      (post) => {
        if (controller.signal.aborted) {
          return;
        }
        setFetched(post ? { status: 'success', post } : { status: 'notFound' });
      },
      () => {
        // An aborted request belongs to a page the user already left; never touch its state.
        if (!controller.signal.aborted) {
          setFetched({ status: 'error' });
        }
      },
    );
    return () => {
      controller.abort();
    };
  }, [postId, hasCachedPost, attempt]);

  const retry = useCallback(() => {
    setFetched({ status: 'loading' });
    setAttempt((current) => current + 1);
  }, []);

  if (postId === null) {
    return { result: { status: 'notFound' }, retry };
  }
  return { result: cachedPost ? { status: 'success', post: cachedPost } : fetched, retry };
}
