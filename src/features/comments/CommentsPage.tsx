import type { JSX } from 'react';
import { useRef } from 'react';
import type { CommentsApi } from './api/mockServer';
import { commentsApi } from './api/mockServer';
import { CommentForm } from './components/CommentForm';
import { CommentItem } from './components/CommentItem';
import { useComments } from './hooks/useComments';
import type { DisplayStatus } from './model/commentsReducer';
import { getDisplayStatus } from './model/commentsReducer';
import './CommentsPage.css';

export type CommentsPageProps = Readonly<{
  /** Injected in tests to make latency and failures deterministic. */
  api?: CommentsApi;
}>;

const plural = (count: number, word: string): string => `${count} ${word}${count === 1 ? '' : 's'}`;

function describeOutbox(statuses: readonly DisplayStatus[]): string {
  const count = (status: DisplayStatus): number => statuses.filter((s) => s === status).length;
  const parts = [
    count('sending') > 0 ? 'Sending a comment.' : '',
    count('queued') > 0 ? `${plural(count('queued'), 'comment')} queued.` : '',
    count('failed') > 0 ? `${plural(count('failed'), 'comment')} failed to send.` : '',
  ].filter((part) => part !== '');
  return parts.length > 0 ? parts.join(' ') : 'All comments sent.';
}

export function CommentsPage({ api = commentsApi }: CommentsPageProps): JSX.Element {
  const { comments, isHistoryLoading, isOnline, sendingClientId, postComment, retryComment } =
    useComments(api);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const items = comments.map((comment) => ({
    comment,
    status: getDisplayStatus(comment, sendingClientId),
  }));

  // Posting clears (and so disables) the Post button and Retry removes its own button, so focus
  // returns to the composer instead of being dropped on <body>.
  const focusComposer = (): void => {
    textareaRef.current?.focus();
  };

  const handlePost = (text: string): void => {
    postComment(text);
    focusComposer();
  };

  const handleRetry = (clientId: string): void => {
    retryComment(clientId);
    focusComposer();
  };

  return (
    <section className="comments" aria-labelledby="page-title">
      <h1 id="page-title">Comments</h1>

      {!isOnline && (
        <p className="comments__offline" role="status">
          You’re offline. New comments are queued and sent automatically when you reconnect.
        </p>
      )}

      <CommentForm onPost={handlePost} textareaRef={textareaRef} />

      <p className="visually-hidden" aria-live="polite">
        {describeOutbox(items.map((item) => item.status))}
      </p>

      <h2 className="comments__heading" id="comments-heading">
        {plural(comments.length, 'comment')}
      </h2>
      {isHistoryLoading && <p className="comments__loading">Loading earlier comments…</p>}
      <ol className="comments__list" aria-labelledby="comments-heading">
        {items.map(({ comment, status }) => (
          <CommentItem
            key={comment.clientId}
            comment={comment}
            status={status}
            onRetry={handleRetry}
          />
        ))}
      </ol>
    </section>
  );
}
