import type { JSX } from 'react';
import { Link, Route, Routes, useParams } from 'react-router';
import { FeedList } from './components/FeedList';
import { PostDetail } from './components/PostDetail';
import { feedStore } from './model/feedStore';
import { parsePostId } from './model/post';

function PostDetailRoute(): JSX.Element {
  const postId = parsePostId(useParams()['postId']);
  if (postId === null) {
    return (
      <section>
        <h1>Post not found</h1>
        <Link to="..">Back to feed</Link>
      </section>
    );
  }
  // Keyed so navigating between posts starts from a clean fetch state.
  return <PostDetail key={postId} postId={postId} store={feedStore} />;
}

export function FeedPage(): JSX.Element {
  return (
    <Routes>
      <Route index element={<FeedList store={feedStore} />} />
      <Route path=":postId" element={<PostDetailRoute />} />
    </Routes>
  );
}
