import type { JSX } from 'react';
import { useRef } from 'react';
import type { CommentsApi } from './api/mockServer';
import { commentsApi } from './api/mockServer';
import { CommentForm } from './components/CommentForm';
import { CommentItem } from './components/CommentItem';
import { useComments } from './hooks/useComments';
import { useConnectionMessage } from './hooks/useConnectionMessage';
import type { CommentView, SendOutcome } from './model/commentsReducer';
import { plural, snippet } from './model/text';
import './CommentsPage.css';

export type CommentsPageProps = Readonly<{
  /** Injected in tests to make latency and failures deterministic. */
  api?: CommentsApi;
}>;

function describeOutcome(outcome: SendOutcome | null, views: readonly CommentView[]): string {
  const view = views.find(({ comment }) => comment.clientId === outcome?.clientId);
  if (outcome === null || view === undefined) {
    return '';
  }
  const quote = `"${snippet(view.comment.text)}"`;
  return outcome.result === 'sent' ? `Comment sent: ${quote}` : `Comment failed to send: ${quote}`;
}

export function CommentsPage({ api = commentsApi }: CommentsPageProps): JSX.Element {
  const { views, historyStatus, isOnline, lastOutcome, postComment, retryComment, retryHistory } =
    useComments(api);
  const sendingCount = views.filter(({ status }) => status === 'sending').length;
  const connection = useConnectionMessage(isOnline, sendingCount);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Posting clears (and so disables) the Post button; keep focus in the composer.
  const handlePost = (text: string): void => {
    postComment(text);
    textareaRef.current?.focus();
  };

  return (
    <section className="comments" aria-labelledby="page-title">
      <h1 className="comments__title" id="page-title">
        Comments
      </h1>

      {/* Always mounted so screen readers announce changes; only the text and look change. */}
      <p
        role="status"
        className={
          connection.tone === 'idle'
            ? 'visually-hidden'
            : `comments__connection comments__connection--${connection.tone}`
        }
      >
        {connection.text}
      </p>

      <CommentForm onPost={handlePost} textareaRef={textareaRef} />

      <p className="visually-hidden" aria-live="polite">
        {describeOutcome(lastOutcome, views)}
      </p>

      <h2 className="comments__heading">
        {historyStatus === 'loaded' ? plural(views.length, 'comment') : 'Thread'}
      </h2>

      {historyStatus === 'loading' && (
        <div className="comments__skeleton">
          <p className="visually-hidden">Loading earlier comments…</p>
          <div className="comments__skeleton-item" aria-hidden="true" />
          <div className="comments__skeleton-item" aria-hidden="true" />
        </div>
      )}
      {historyStatus === 'error' && (
        <div className="comments__history-error" role="alert">
          <p className="comments__history-error-text">Couldn’t load earlier comments.</p>
          <button type="button" className="comments__history-retry" onClick={retryHistory}>
            Try again
          </button>
        </div>
      )}

      <ol className="comments__list" aria-label="Comment thread">
        {views.map((view) => (
          <CommentItem key={view.comment.clientId} view={view} onRetry={retryComment} />
        ))}
      </ol>
    </section>
  );
}
