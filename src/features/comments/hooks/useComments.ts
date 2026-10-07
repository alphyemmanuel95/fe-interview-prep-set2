import { useEffect, useReducer } from 'react';
import type { CommentsApi } from '../api/mockServer';
import type {
  CommentsState,
  CommentView,
  HistoryState,
  SendOutcome,
} from '../model/commentsReducer';
import {
  commentsReducer,
  createInitialState,
  selectCommentViews,
  selectNextToSend,
} from '../model/commentsReducer';
import { loadOutbox, saveOutbox } from '../model/outboxStorage';
import { useOnlineStatus } from './useOnlineStatus';

export type UseCommentsResult = Readonly<{
  views: readonly CommentView[];
  historyStatus: HistoryState['status'];
  isOnline: boolean;
  lastOutcome: SendOutcome | null;
  postComment: (text: string) => void;
  retryComment: (clientId: string) => void;
  retryHistory: () => void;
}>;

const initState = (): CommentsState => createInitialState(loadOutbox());

export function useComments(api: CommentsApi): UseCommentsResult {
  const [state, dispatch] = useReducer(commentsReducer, undefined, initState);
  const isOnline = useOnlineStatus();
  const historyAttempt = state.history.attempt;
  const nextToSend = selectNextToSend(state.comments, isOnline);

  useEffect(() => {
    saveOutbox(state.comments);
  }, [state.comments]);

  useEffect(() => {
    const controller = new AbortController();
    api.getComments(controller.signal).then(
      (comments) => {
        if (!controller.signal.aborted) {
          dispatch({ type: 'historyLoaded', comments });
        }
      },
      (error: unknown) => {
        if (controller.signal.aborted) {
          return;
        }
        console.warn('Could not load comment history', error);
        dispatch({ type: 'historyFailed' });
      },
    );
    return () => {
      controller.abort();
    };
  }, [api, historyAttempt]);

  // Single sequential sender: only the head of the outbox is ever on the wire, so the server
  // receives comments in the order they were written. The effect is keyed on the head's
  // clientId (text and createdAt never change for a given id), so it re-runs only when a
  // different comment becomes sendable, or when going offline makes nothing sendable.
  // Going offline or unmounting aborts the request; the comment stays pending and is resent
  // with the same clientId, which the server treats as an idempotency key — no duplicates.
  const nextClientId = nextToSend?.clientId;
  const nextText = nextToSend?.text;
  const nextCreatedAt = nextToSend?.createdAt;
  useEffect(() => {
    if (nextClientId === undefined || nextText === undefined || nextCreatedAt === undefined) {
      return;
    }
    const controller = new AbortController();
    const comment = { clientId: nextClientId, text: nextText, createdAt: nextCreatedAt };
    api.postComment(comment, controller.signal).then(
      (saved) => {
        // A response that lands after abort is ignored; the resend is deduplicated server-side.
        if (!controller.signal.aborted) {
          dispatch({ type: 'sendSucceeded', clientId: nextClientId, serverId: saved.id });
        }
      },
      () => {
        if (!controller.signal.aborted) {
          dispatch({ type: 'sendFailed', clientId: nextClientId });
        }
      },
    );
    return () => {
      controller.abort();
    };
  }, [api, nextClientId, nextText, nextCreatedAt]);

  // Ids and timestamps are created here, not in the reducer, so the reducer stays pure.
  const postComment = (text: string): void => {
    dispatch({
      type: 'enqueue',
      comment: { clientId: crypto.randomUUID(), text, createdAt: new Date().toISOString() },
    });
  };

  const retryComment = (clientId: string): void => {
    dispatch({ type: 'retry', clientId });
  };

  const retryHistory = (): void => {
    dispatch({ type: 'historyRetried' });
  };

  return {
    views: selectCommentViews(state.comments, isOnline),
    historyStatus: state.history.status,
    isOnline,
    lastOutcome: state.lastOutcome,
    postComment,
    retryComment,
    retryHistory,
  };
}
