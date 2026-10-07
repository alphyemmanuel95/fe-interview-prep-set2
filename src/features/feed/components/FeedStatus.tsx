import type { JSX } from 'react';
import { assertNever } from '../../../shared/assertNever';
import type { FeedPhase } from '../model/feedReducer';
import './FeedStatus.css';

type FeedStatusProps = Readonly<{
  phase: FeedPhase;
  postCount: number;
  onRetry: () => void;
}>;

function renderPhase(phase: FeedPhase, postCount: number, onRetry: () => void): JSX.Element | null {
  switch (phase.status) {
    case 'idle':
      return null;
    case 'loading':
      return (
        <p className="feed-status__message">
          <span className="feed-status__spinner" aria-hidden="true" />
          {postCount === 0 ? 'Loading posts…' : 'Loading more posts…'}
        </p>
      );
    case 'error':
      return (
        <div className="feed-status__error">
          <p className="feed-status__message">Could not load posts: {phase.error}</p>
          <button type="button" className="feed-status__retry" onClick={onRetry}>
            Retry
          </button>
        </div>
      );
    case 'done':
      return <p className="feed-status__message">You&apos;ve reached the end</p>;
    default:
      return assertNever(phase);
  }
}

// The live region stays mounted for every phase so screen readers reliably announce changes.
export function FeedStatus({ phase, postCount, onRetry }: FeedStatusProps): JSX.Element {
  return (
    <div className="feed-status" role="status" aria-live="polite">
      {renderPhase(phase, postCount, onRetry)}
    </div>
  );
}
