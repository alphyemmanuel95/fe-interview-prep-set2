import { useEffect, useReducer } from 'react';
import type { CommentsApi } from '../api/mockServer';
import type { Comment, CommentsState } from '../model/commentsReducer';
import { commentsReducer, createInitialState, selectNextToSend } from '../model/commentsReducer';
import { loadOutbox, saveOutbox } from '../model/outboxStorage';
import { useOnlineStatus } from './useOnlineStatus';

export type UseCommentsResult = Readonly<{
  comments: readonly Comment[];
  isHistoryLoading: boolean;
  isOnline: boolean;
  sendingClientId: string | undefined;
  postComment: (text: string) => void;
  retryComment: (clientId: string) => void;
}>;

const initState = (): CommentsState => createInitialState(loadOutbox());

export function useComments(api: CommentsApi): UseCommentsResult {
  const [state, dispatch] = useReducer(commentsReducer, undefined, initState);
  const isOnline = useOnlineStatus();
  const nextToSend = selectNextToSend(state.comments, isOnline);

  useEffect(() => {
    saveOutbox(state.comments);
  }, [state.comments]);

  useEffect(() => {
    const controller = new AbortController();
    api.getComments(controller.signal).then(
      (comments) => {
        dispatch({ type: 'historyLoaded', comments });
      },
      () => {
        // Aborted on unmount; the mock read path has no other failure mode.
      },
    );
    return () => {
      controller.abort();
    };
  }, [api]);

  // Single sequential sender. Only the oldest pending comment is ever on the wire, so comments
  // reach the server in the order they were written. The effect re-runs only when that head
  // changes (reducer updates keep untouched comments referentially stable). Going offline or
  // unmounting aborts the request; the comment stays pending and is resent with the same
  // clientId, which the server treats as an idempotency key — so a resend can't duplicate.
  useEffect(() => {
    if (nextToSend === undefined) {
      return;
    }
    const { clientId, text, createdAt } = nextToSend;
    const controller = new AbortController();
    api.postComment({ clientId, text, createdAt }, controller.signal).then(
      (saved) => {
        dispatch({ type: 'sendSucceeded', clientId, serverId: saved.id });
      },
      () => {
        if (!controller.signal.aborted) {
          dispatch({ type: 'sendFailed', clientId });
        }
      },
    );
    return () => {
      controller.abort();
    };
  }, [api, nextToSend]);

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

  return {
    comments: state.comments,
    isHistoryLoading: state.history === 'loading',
    isOnline,
    sendingClientId: nextToSend?.clientId,
    postComment,
    retryComment,
  };
}
