import type { JSX, MouseEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { assertNever } from '../../../shared/assertNever';
import { usePost } from '../hooks/usePost';
import type { PostResult } from '../hooks/usePost';
import type { FeedStore } from '../model/feedStore';
import { isFromFeed } from '../model/navigation';
import { PostMeta } from './PostMeta';
import './PostDetail.css';

type PostDetailProps = Readonly<{ postId: number; store: FeedStore }>;

function renderResult(result: PostResult, onRetry: () => void): JSX.Element {
  switch (result.status) {
    case 'loading':
      return <p className="post-detail__message">Loading post…</p>;
    case 'error':
      return (
        <div className="post-detail__error">
          <p className="post-detail__message">Could not load this post: {result.error}</p>
          <button type="button" className="post-detail__retry" onClick={onRetry}>
            Retry
          </button>
        </div>
      );
    case 'success':
      return (
        <article className="post-detail__article">
          <h1 className="post-detail__title">{result.post.title}</h1>
          <p className="post-detail__body">{result.post.body}</p>
          <PostMeta post={result.post} />
        </article>
      );
    default:
      return assertNever(result);
  }
}

export function PostDetail({ postId, store }: PostDetailProps): JSX.Element {
  const { result, retry } = usePost(postId, store);
  const location = useLocation();
  const navigate = useNavigate();

  // Popping history (rather than pushing /feed) lets ScrollRestoration put the user back
  // exactly where they were. Deep links have no feed entry behind them, so they follow the href.
  const handleBackClick = (event: MouseEvent<HTMLAnchorElement>): void => {
    if (isFromFeed(location.state)) {
      event.preventDefault();
      void navigate(-1);
    }
  };

  return (
    <section className="post-detail">
      <Link to=".." className="post-detail__back" onClick={handleBackClick}>
        ← Back to feed
      </Link>
      <div role="status" aria-live="polite" className="visually-hidden">
        {result.status === 'loading' ? 'Loading post' : ''}
      </div>
      {renderResult(result, retry)}
    </section>
  );
}
