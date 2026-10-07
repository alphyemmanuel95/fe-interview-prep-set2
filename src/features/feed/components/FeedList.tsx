import type { JSX } from 'react';
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

  return (
    <section className="feed" aria-labelledby="feed-title">
      <h1 id="feed-title">Infinite Feed</h1>
      <ul className="feed__list" aria-label="Posts">
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
            <PostCard post={post} />
          </li>
        ))}
      </ul>
      {phase.status === 'idle' && <div ref={sentinelRef} className="feed__sentinel" />}
      <FeedStatus phase={phase} postCount={posts.length} onRetry={retry} />
    </section>
  );
}
