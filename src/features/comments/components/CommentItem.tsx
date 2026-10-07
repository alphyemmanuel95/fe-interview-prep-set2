import type { JSX } from 'react';
import { useRef } from 'react';
import { assertNever } from '../../../shared/assertNever';
import type { CommentView, DisplayStatus } from '../model/commentsReducer';
import { snippet } from '../model/text';
import './CommentItem.css';

const timeFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: 'medium',
  timeStyle: 'short',
});

/** Badge text, or `null` for history comments that need no status at all. */
function statusLabel(status: DisplayStatus): string | null {
  switch (status) {
    case 'sending':
      return 'Sending…';
    case 'queued-offline':
      return 'Queued (offline)';
    case 'blocked':
      return 'Queued — waiting for the failed comment above';
    case 'failed':
      return 'Failed to send';
    case 'sent':
      return 'Sent';
    case 'published':
      return null;
    default:
      return assertNever(status);
  }
}

export type CommentItemProps = Readonly<{
  view: CommentView;
  onRetry: (clientId: string) => void;
}>;

export function CommentItem({ view, onRetry }: CommentItemProps): JSX.Element {
  const { comment, status } = view;
  const itemRef = useRef<HTMLLIElement>(null);
  const label = statusLabel(status);

  // Retry removes its own button; focus stays on this comment instead of falling to <body>.
  const handleRetry = (): void => {
    onRetry(comment.clientId);
    itemRef.current?.focus();
  };

  return (
    <li ref={itemRef} tabIndex={-1} className={`comment comment--${status}`}>
      <p className="comment__text">{comment.text}</p>
      <div className="comment__meta">
        <time dateTime={comment.createdAt}>
          {timeFormatter.format(new Date(comment.createdAt))}
        </time>
        {label !== null && (
          <span className={`comment__badge comment__badge--${status}`}>{label}</span>
        )}
        {status === 'failed' && (
          <button
            type="button"
            className="comment__retry"
            aria-label={`Retry sending "${snippet(comment.text)}"`}
            onClick={handleRetry}
          >
            Retry
          </button>
        )}
      </div>
    </li>
  );
}
