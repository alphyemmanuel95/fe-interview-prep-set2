import { useEffect, useRef } from 'react';
import type { JSX, MouseEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { assertNever } from '../../../shared/assertNever';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { usePost } from '../hooks/usePost';
import type { PostResult } from '../hooks/usePost';
import type { FeedStore } from '../model/feedStore';
import { isFromFeed } from '../model/navigation';
import { PostMeta } from './PostMeta';
import './PostDetail.css';

type PostDetailProps = Readonly<{ postId: number | null; store: FeedStore }>;

function headingFor(result: PostResult): string {
  switch (result.status) {
    case 'loading':
      return 'Loading post…';
    case 'error':
      return "Couldn't load this post";
    case 'notFound':
      return 'Post not found';
    case 'success':
      return result.post.title;
    default:
      return assertNever(result);
  }
}

const ERROR_HINT = 'Check your connection and try again.';
const NOT_FOUND_HINT = 'This post may have been removed, or the link is wrong.';

function announcementFor(result: PostResult): string {
  switch (result.status) {
    case 'loading':
    case 'success':
      return '';
    case 'error':
      return `${headingFor(result)}. ${ERROR_HINT}`;
    case 'notFound':
      return headingFor(result);
    default:
      return assertNever(result);
  }
}

export function PostDetail({ postId, store }: PostDetailProps): JSX.Element {
  const { result, retry } = usePost(postId, store);
  const location = useLocation();
  const navigate = useNavigate();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const heading = headingFor(result);

  // One persistent h1 (its text changes with the result) takes focus on arrival, so screen reader
  // and keyboard users start at the new page's content rather than wherever the click left them.
  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  useDocumentTitle(`${heading} · Infinite Feed`);

  // Popping history (rather than pushing /feed) lets ScrollRestoration put the user back exactly
  // where they were. That only works if the feed is still in memory: after a refresh on this page
  // the store is empty, so we follow the href and push a fresh /feed instead.
  const handleBackClick = (event: MouseEvent<HTMLAnchorElement>): void => {
    if (isFromFeed(location.state) && store.getState().posts.length > 0) {
      event.preventDefault();
      void navigate(-1);
    }
  };

  // Retry unmounts its own button; park focus on the heading so it is not lost to <body>.
  const handleRetryClick = (): void => {
    headingRef.current?.focus();
    retry();
  };

  return (
    <section className="post-detail" aria-labelledby="post-detail-title">
      <Link to=".." className="post-detail__back" onClick={handleBackClick}>
        <span aria-hidden="true">←</span> Back to feed
      </Link>
      <article className="post-detail__article">
        <h1 id="post-detail-title" ref={headingRef} tabIndex={-1} className="post-detail__title">
          {heading}
        </h1>
        {result.status === 'error' && (
          <>
            <p className="post-detail__message post-detail__message--error">{ERROR_HINT}</p>
            <button type="button" className="post-detail__retry" onClick={handleRetryClick}>
              Retry
            </button>
          </>
        )}
        {result.status === 'notFound' && <p className="post-detail__message">{NOT_FOUND_HINT}</p>}
        {result.status === 'success' && (
          <>
            <p className="post-detail__body">{result.post.body}</p>
            <PostMeta post={result.post} />
          </>
        )}
      </article>
      {/* Mounted up front so the outcome is announced; the focused h1 already reads "Loading". */}
      <p role="status" className="visually-hidden">
        {announcementFor(result)}
      </p>
    </section>
  );
}
