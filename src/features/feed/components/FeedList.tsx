import type { JSX } from 'react';
import { useInfinitePosts } from '../hooks/useInfinitePosts';
import { useIntersectionSentinel } from '../hooks/useIntersectionSentinel';
import type { FeedStore } from '../model/feedStore';
import { FeedStatus } from './FeedStatus';
import { PostCard } from './PostCard';
import './FeedList.css';

type FeedListProps = Readonly<{ store: FeedStore }>;

export function FeedList({ store }: FeedListProps): JSX.Element {
  const { posts, phase, loadNextPage, retry } = useInfinitePosts(store);
  const sentinelRef = useIntersectionSentinel(loadNextPage);

  return (
    <section className="feed" aria-labelledby="feed-title">
      <h1 id="feed-title">Infinite Feed</h1>
      <ul className="feed__list" aria-label="Posts">
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
