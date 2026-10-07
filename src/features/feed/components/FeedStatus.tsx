import { useRef } from 'react';
import type { JSX } from 'react';
import { assertNever } from '../../../shared/assertNever';
import type { FeedPhase } from '../model/feedReducer';
import './FeedStatus.css';

type FeedStatusProps = Readonly<{
  phase: FeedPhase;
  postCount: number;
  onRetry: () => void;
}>;

function describePhase(phase: FeedPhase, postCount: number): string {
  switch (phase.status) {
    case 'idle':
      return '';
    case 'loading':
      return postCount === 0 ? 'Loading posts…' : 'Loading more posts…';
    case 'error':
      return "Couldn't load posts. Check your connection and try again.";
    case 'done':
      return "You've reached the end";
    default:
      return assertNever(phase);
  }
}

export function FeedStatus({ phase, postCount, onRetry }: FeedStatusProps): JSX.Element {
  const messageRef = useRef<HTMLParagraphElement>(null);
  const isError = phase.status === 'error';

  // The Retry button unmounts as soon as it is pressed; moving focus to the status message
  // keeps keyboard and screen reader users in place instead of dropping focus to <body>.
  const handleRetryClick = (): void => {
    messageRef.current?.focus();
    onRetry();
  };

  return (
    <div className="feed-status">
      {/* Always mounted so every change is announced; only the message is live, not the button. */}
      <p
        ref={messageRef}
        className={
          isError ? 'feed-status__message feed-status__message--error' : 'feed-status__message'
        }
        role="status"
        tabIndex={-1}
      >
        {phase.status === 'loading' && <span className="feed-status__spinner" aria-hidden="true" />}
        {describePhase(phase, postCount)}
      </p>
      {isError && (
        <button type="button" className="feed-status__retry" onClick={handleRetryClick}>
          Retry
        </button>
      )}
    </div>
  );
}
