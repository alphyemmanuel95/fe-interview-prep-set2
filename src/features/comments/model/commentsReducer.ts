import { assertNever } from '../../../shared/assertNever';
import type { NewComment, ServerComment } from '../api/mockServer';

// Only three statuses are stored. "Sending" is derived (see `getDisplayStatus`): the oldest
// pending comment is the one in flight whenever we are online. Storing it would let a refresh
// persist a "sending" comment whose request no longer exists.
export type Comment = NewComment &
  Readonly<{ status: 'pending' } | { status: 'failed' } | { status: 'sent'; serverId: string }>;

export type UnsentComment = Extract<Comment, { status: 'pending' | 'failed' }>;

export type CommentsState = Readonly<{
  comments: readonly Comment[];
  history: 'loading' | 'loaded';
}>;

export type CommentsAction =
  | Readonly<{ type: 'enqueue'; comment: NewComment }>
  | Readonly<{ type: 'sendSucceeded'; clientId: string; serverId: string }>
  | Readonly<{ type: 'sendFailed'; clientId: string }>
  | Readonly<{ type: 'retry'; clientId: string }>
  | Readonly<{ type: 'historyLoaded'; comments: readonly ServerComment[] }>;

export type DisplayStatus = 'sending' | 'queued' | 'failed' | 'sent';

export const createInitialState = (outbox: readonly UnsentComment[]): CommentsState => ({
  comments: outbox,
  history: 'loading',
});

const isUnsent = (comment: Comment): comment is UnsentComment => comment.status !== 'sent';

export const selectUnsent = (comments: readonly Comment[]): readonly UnsentComment[] =>
  comments.filter(isUnsent);

/** The comment that should be on the wire right now: the oldest pending one, if online. */
export const selectNextToSend = (
  comments: readonly Comment[],
  isOnline: boolean,
): UnsentComment | undefined =>
  isOnline
    ? comments.find((comment): comment is UnsentComment => comment.status === 'pending')
    : undefined;

export function getDisplayStatus(
  comment: Comment,
  sendingClientId: string | undefined,
): DisplayStatus {
  switch (comment.status) {
    case 'pending':
      return comment.clientId === sendingClientId ? 'sending' : 'queued';
    case 'failed':
      return 'failed';
    case 'sent':
      return 'sent';
    default:
      return assertNever(comment);
  }
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
            ? { ...comment, status: 'sent', serverId: action.serverId }
            : comment,
        ),
      };

    case 'sendFailed':
      return {
        ...state,
        comments: state.comments.map((comment) =>
          comment.clientId === action.clientId && comment.status === 'pending'
            ? { ...comment, status: 'failed' }
            : comment,
        ),
      };

    case 'retry': {
      // A retried comment goes to the back of the queue, so the list mirrors the order the
      // server will store it in, and a retry never pre-empts a request already in flight.
      const target = state.comments.find(
        (comment) => comment.clientId === action.clientId && comment.status === 'failed',
      );
      if (target === undefined) {
        return state;
      }
      return {
        ...state,
        comments: [
          ...state.comments.filter((comment) => comment !== target),
          { ...target, status: 'pending' },
        ],
      };
    }

    case 'historyLoaded': {
      // The server is the source of truth for anything it already has — including a comment
      // whose response was lost — so local copies with a known clientId are dropped.
      const serverClientIds = new Set(action.comments.map((comment) => comment.clientId));
      const fromServer = action.comments.map((comment): Comment => ({
        clientId: comment.clientId,
        text: comment.text,
        createdAt: comment.createdAt,
        status: 'sent',
        serverId: comment.id,
      }));
      const localOnly = state.comments.filter((comment) => !serverClientIds.has(comment.clientId));
      return { comments: [...fromServer, ...localOnly], history: 'loaded' };
    }

    default:
      return assertNever(action);
  }
}
