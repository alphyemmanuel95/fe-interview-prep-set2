import { useLayoutEffect, useRef } from 'react';
import type { JSX } from 'react';
import { NavigationType, useNavigationType } from 'react-router';
import { PAGE_SIZE } from '../api/postsApi';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useInfinitePosts } from '../hooks/useInfinitePosts';
import { useIntersectionSentinel } from '../hooks/useIntersectionSentinel';
import type { FeedStore } from '../model/feedStore';
import { FeedStatus } from './FeedStatus';
import { PostCard } from './PostCard';
import './FeedList.css';

const SKELETON_KEYS = Array.from({ length: PAGE_SIZE }, (_, index) => `skeleton-${index}`);

type FeedListProps = Readonly<{ store: FeedStore }>;

export function FeedList({ store }: FeedListProps): JSX.Element {
  const { posts, phase, loadNextPage, retry } = useInfinitePosts(store);
  const sentinelRef = useIntersectionSentinel(loadNextPage);
  useDocumentTitle('Infinite Feed');
  const navigationType = useNavigationType();
  const listRef = useRef<HTMLUListElement>(null);

  // A PUSH (nav link, or Back to feed after a refresh) is a fresh visit, so start over with fresh
  // posts. A POP (Back) is a return trip: keeping the cached list is what lets ScrollRestoration
  // land on the same spot, and focus goes back to the post the user opened so keyboard users
  // resume where they left off. preventScroll leaves positioning to ScrollRestoration.
  // A layout effect, so the reset happens before paint and stale posts never flash.
  useLayoutEffect(() => {
    if (navigationType !== NavigationType.Pop) {
      store.dispatch({ type: 'feedReset' });
      return;
    }
    const { lastOpenedPostId } = store.getState();
    if (lastOpenedPostId !== null) {
      listRef.current
        ?.querySelector<HTMLElement>(`[data-post-id="${lastOpenedPostId}"]`)
        ?.focus({ preventScroll: true });
    }
  }, [navigationType, store]);

  const handleOpen = (postId: number): void => {
    store.dispatch({ type: 'postOpened', postId });
  };

  return (
    <section className="feed" aria-labelledby="feed-title">
      <h1 id="feed-title">Infinite Feed</h1>
      <ul ref={listRef} className="feed__list" aria-label="Posts">
        {/* Placeholder cards on first load keep the page height stable instead of jumping. */}
        {posts.length === 0 &&
          phase.status === 'loading' &&
          SKELETON_KEYS.map((key) => (
            <li key={key} aria-hidden="true">
              <div className="feed__skeleton" />
            </li>
          ))}
        {posts.map((post) => (
          <li key={post.id}>
            <PostCard post={post} onOpen={handleOpen} />
          </li>
        ))}
      </ul>
      {phase.status === 'idle' && <div ref={sentinelRef} className="feed__sentinel" />}
      <FeedStatus phase={phase} postCount={posts.length} onRetry={retry} />
    </section>
  );
}
