import { assertNever } from '../../../shared/assertNever';
import type { NewComment, ServerComment } from '../api/mockServer';

// Only the facts are stored: pending, failed or sent. Whether a pending comment is "sending",
// "queued (offline)" or "waiting behind a failure" is derived (see `selectCommentViews`), so a
// refresh can never restore a "sending" comment whose request no longer exists.
export type Comment = NewComment &
  Readonly<
    | { status: 'pending' }
    | { status: 'failed' }
    // `source` separates comments posted in this browser from history loaded from the server.
    | { status: 'sent'; serverId: string; source: 'local' | 'history' }
  >;

export type UnsentComment = Extract<Comment, { status: 'pending' | 'failed' }>;

// `attempt` keys the history request, so "Retry" re-runs the loading effect.
export type HistoryState = Readonly<{ status: 'loading' | 'loaded' | 'error'; attempt: number }>;

export type SendOutcome = Readonly<{ clientId: string; result: 'sent' | 'failed' }>;

export type CommentsState = Readonly<{
  comments: readonly Comment[];
  history: HistoryState;
  /** Latest send result, kept only so it can be announced to screen readers. */
  lastOutcome: SendOutcome | null;
}>;

export type CommentsAction =
  | Readonly<{ type: 'enqueue'; comment: NewComment }>
  | Readonly<{ type: 'sendSucceeded'; clientId: string; serverId: string }>
  | Readonly<{ type: 'sendFailed'; clientId: string }>
  | Readonly<{ type: 'retry'; clientId: string }>
  | Readonly<{ type: 'historyLoaded'; comments: readonly ServerComment[] }>
  | Readonly<{ type: 'historyFailed' }>
  | Readonly<{ type: 'historyRetried' }>;

export type DisplayStatus =
  'sending' | 'queued-offline' | 'blocked' | 'failed' | 'sent' | 'published';

export type CommentView = Readonly<{ comment: Comment; status: DisplayStatus }>;

export const createInitialState = (outbox: readonly UnsentComment[]): CommentsState => ({
  comments: outbox,
  history: { status: 'loading', attempt: 0 },
  lastOutcome: null,
});

const isUnsent = (comment: Comment): comment is UnsentComment => comment.status !== 'sent';

export const selectUnsent = (comments: readonly Comment[]): readonly UnsentComment[] =>
  comments.filter(isUnsent);

/**
 * The comment that should be on the wire right now. The outbox is strict FIFO with
 * head-of-line blocking: only the oldest unsent comment may be sent, and while it has failed
 * nothing behind it moves until it is retried — so the server always receives comments in order.
 */
export const selectNextToSend = (
  comments: readonly Comment[],
  isOnline: boolean,
): UnsentComment | undefined => {
  const head = comments.find(isUnsent);
  return isOnline && head?.status === 'pending' ? head : undefined;
};

export function selectCommentViews(
  comments: readonly Comment[],
  isOnline: boolean,
): readonly CommentView[] {
  let isBehindFailure = false;
  return comments.map((comment): CommentView => {
    switch (comment.status) {
      case 'failed':
        isBehindFailure = true;
        return { comment, status: 'failed' };
      case 'pending':
        if (isBehindFailure) {
          return { comment, status: 'blocked' };
        }
        // Waiting for its turn behind the in-flight comment still counts as "sending": the
        // user has nothing to do, the sender will get to it.
        return { comment, status: isOnline ? 'sending' : 'queued-offline' };
      case 'sent':
        return { comment, status: comment.source === 'local' ? 'sent' : 'published' };
      default:
        return assertNever(comment);
    }
  });
}

function mergeHistory(
  local: readonly Comment[],
  serverComments: readonly ServerComment[],
): readonly Comment[] {
  // The server is the source of truth for anything it already has — including a comment whose
  // response was lost — so a local copy with a known clientId becomes a sent comment.
  const localIds = new Set(local.map((comment) => comment.clientId));
  const serverIds = new Set(serverComments.map((comment) => comment.clientId));
  const fromServer = serverComments.map((comment): Comment => ({
    clientId: comment.clientId,
    text: comment.text,
    createdAt: comment.createdAt,
    status: 'sent',
    serverId: comment.id,
    source: localIds.has(comment.clientId) ? 'local' : 'history',
  }));
  return [...fromServer, ...local.filter((comment) => !serverIds.has(comment.clientId))];
}

export function commentsReducer(state: CommentsState, action: CommentsAction): CommentsState {
  switch (action.type) {
    case 'enqueue':
      return { ...state, comments: [...state.comments, { ...action.comment, status: 'pending' }] };

    case 'sendSucceeded':
      return {
        ...state,
        comments: state.comments.map((comment) =>
          comment.clientId === action.clientId && comment.status === 'pending'
            ? { ...comment, status: 'sent', serverId: action.serverId, source: 'local' }
            : comment,
        ),
        lastOutcome: { clientId: action.clientId, result: 'sent' },
      };

    case 'sendFailed':
      return {
        ...state,
        comments: state.comments.map((comment) =>
          comment.clientId === action.clientId && comment.status === 'pending'
            ? { ...comment, status: 'failed' }
            : comment,
        ),
        lastOutcome: { clientId: action.clientId, result: 'failed' },
      };

    case 'retry':
      // The comment keeps its place: it is still the head of the queue, so it is resent (with
      // the same clientId) before anything queued behind it.
      return {
        ...state,
        comments: state.comments.map((comment) =>
          comment.clientId === action.clientId && comment.status === 'failed'
            ? { ...comment, status: 'pending' }
            : comment,
        ),
      };

    case 'historyLoaded':
      return {
        ...state,
        comments: mergeHistory(state.comments, action.comments),
        history: { ...state.history, status: 'loaded' },
      };

    case 'historyFailed':
      return { ...state, history: { ...state.history, status: 'error' } };

    case 'historyRetried':
      return { ...state, history: { status: 'loading', attempt: state.history.attempt + 1 } };

    default:
      return assertNever(action);
  }
}
