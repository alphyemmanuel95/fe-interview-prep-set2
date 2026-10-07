import type { JSX } from 'react';
import { assertNever } from '../../../shared/assertNever';
import type { Comment, DisplayStatus } from '../model/commentsReducer';
import './CommentItem.css';

const SNIPPET_LENGTH = 30;

const timeFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: 'medium',
  timeStyle: 'short',
});

const snippet = (text: string): string =>
  text.length > SNIPPET_LENGTH ? `${text.slice(0, SNIPPET_LENGTH)}…` : text;

function statusLabel(status: DisplayStatus): string {
  switch (status) {
    case 'sending':
      return 'Sending…';
    case 'queued':
      return 'Queued';
    case 'failed':
      return 'Failed to send';
    case 'sent':
      return 'Sent';
    default:
      return assertNever(status);
  }
}

export type CommentItemProps = Readonly<{
  comment: Comment;
  status: DisplayStatus;
  onRetry: (clientId: string) => void;
}>;

export function CommentItem({ comment, status, onRetry }: CommentItemProps): JSX.Element {
  return (
    <li className={`comment comment--${status}`}>
      <p className="comment__text">{comment.text}</p>
      <div className="comment__meta">
        <time dateTime={comment.createdAt}>
          {timeFormatter.format(new Date(comment.createdAt))}
        </time>
        <span className={`comment__badge comment__badge--${status}`}>{statusLabel(status)}</span>
        {status === 'failed' && (
          <button
            type="button"
            className="comment__retry"
            aria-label={`Retry sending "${snippet(comment.text)}"`}
            onClick={() => {
              onRetry(comment.clientId);
            }}
          >
            Retry
          </button>
        )}
      </div>
    </li>
  );
}
