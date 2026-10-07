import type { JSX } from 'react';
import { Route, Routes, useParams } from 'react-router';
import { FeedList } from './components/FeedList';
import { PostDetail } from './components/PostDetail';
import { feedStore } from './model/feedStore';
import type { FeedStore } from './model/feedStore';
import { parsePostId } from './model/post';
import './FeedPage.css';

type StoreProps = Readonly<{ store: FeedStore }>;

function PostDetailRoute({ store }: StoreProps): JSX.Element {
  const postId = parsePostId(useParams()['postId']);
  // Keyed so navigating between posts starts from a clean fetch state.
  return <PostDetail key={postId ?? 'invalid'} postId={postId} store={store} />;
}

// The app uses the session-wide store; tests inject a fresh one so no state leaks between them.
type FeedPageProps = Readonly<{ store?: FeedStore }>;

export function FeedPage({ store = feedStore }: FeedPageProps): JSX.Element {
  return (
    <div className="feed-page">
      <Routes>
        <Route index element={<FeedList store={store} />} />
        <Route path=":postId" element={<PostDetailRoute store={store} />} />
      </Routes>
    </div>
  );
}
