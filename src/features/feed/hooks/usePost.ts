import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import { fetchPost, toErrorMessage } from '../api/postsApi';
import type { FeedStore } from '../model/feedStore';
import type { Post } from '../model/post';

export type PostResult =
  | { readonly status: 'loading' }
  | { readonly status: 'error'; readonly error: string }
  | { readonly status: 'success'; readonly post: Post };

export type PostQuery = Readonly<{ result: PostResult; retry: () => void }>;

// Callers key the consumer by `postId`, so this state never outlives the post it belongs to.
export function usePost(postId: number, store: FeedStore): PostQuery {
  // A post already loaded by the feed renders instantly; only deep links hit the network.
  const cachedPost = useSyncExternalStore(store.subscribe, () =>
    store.getState().posts.find((post) => post.id === postId),
  );
  const hasCachedPost = cachedPost !== undefined;
  const [fetched, setFetched] = useState<PostResult>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (hasCachedPost) {
      return undefined;
    }
    const controller = new AbortController();
    fetchPost(postId, controller.signal).then(
      (post) => {
        setFetched({ status: 'success', post });
      },
      (error: unknown) => {
        // An aborted request belongs to a page the user already left; never touch its state.
        if (!controller.signal.aborted) {
          setFetched({ status: 'error', error: toErrorMessage(error) });
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

  return { result: cachedPost ? { status: 'success', post: cachedPost } : fetched, retry };
}
