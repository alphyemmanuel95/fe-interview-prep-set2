import { describe, expect, it } from 'vitest';
import type { CommentsState } from './commentsReducer';
import {
  commentsReducer,
  createInitialState,
  selectCommentViews,
  selectNextToSend,
} from './commentsReducer';

const draft = (clientId: string): { clientId: string; text: string; createdAt: string } => ({
  clientId,
  text: `Comment ${clientId}`,
  createdAt: '2026-10-07T10:00:00.000Z',
});

const enqueueAll = (...clientIds: string[]): CommentsState =>
  clientIds.reduce(
    (state, clientId) => commentsReducer(state, { type: 'enqueue', comment: draft(clientId) }),
    createInitialState([]),
  );

const statuses = (state: CommentsState): string[] =>
  state.comments.map((comment) => `${comment.clientId}:${comment.status}`);

describe('commentsReducer', () => {
  it('enqueues new comments as pending, in order', () => {
    expect(statuses(enqueueAll('a', 'b'))).toEqual(['a:pending', 'b:pending']);
  });

  it('marks a pending comment sent or failed and records the outcome', () => {
    let state = enqueueAll('a', 'b');
    state = commentsReducer(state, { type: 'sendSucceeded', clientId: 'a', serverId: 's-1' });
    expect(state.lastOutcome).toEqual({ clientId: 'a', result: 'sent' });

    state = commentsReducer(state, { type: 'sendFailed', clientId: 'b' });
    expect(state.comments).toEqual([
      { ...draft('a'), status: 'sent', serverId: 's-1', source: 'local' },
      { ...draft('b'), status: 'failed' },
    ]);
    expect(state.lastOutcome).toEqual({ clientId: 'b', result: 'failed' });
  });

  it('ignores a late result for a comment that is no longer pending', () => {
    let state = enqueueAll('a');
    state = commentsReducer(state, { type: 'sendSucceeded', clientId: 'a', serverId: 's-1' });

    expect(commentsReducer(state, { type: 'sendFailed', clientId: 'a' }).comments).toEqual(
      state.comments,
    );
  });

  it('retries a failed comment in its original position', () => {
    let state = enqueueAll('a', 'b');
    state = commentsReducer(state, { type: 'sendFailed', clientId: 'a' });
    state = commentsReducer(state, { type: 'retry', clientId: 'a' });

    expect(statuses(state)).toEqual(['a:pending', 'b:pending']);
  });

  it('merges server history and marks local copies the server already has as sent', () => {
    let state = enqueueAll('a', 'b');
    state = commentsReducer(state, { type: 'sendFailed', clientId: 'a' });
    state = commentsReducer(state, {
      type: 'historyLoaded',
      comments: [
        { ...draft('h'), id: 's-0' },
        { ...draft('a'), id: 's-1' },
      ],
    });

    expect(state.history.status).toBe('loaded');
    expect(state.comments.map((comment) => comment.clientId)).toEqual(['h', 'a', 'b']);
    expect(selectCommentViews(state.comments, true).map((view) => view.status)).toEqual([
      'published',
      'sent',
      'sending',
    ]);
  });

  it('moves history through error and retry, bumping the attempt', () => {
    let state = commentsReducer(createInitialState([]), { type: 'historyFailed' });
    expect(state.history).toEqual({ status: 'error', attempt: 0 });

    state = commentsReducer(state, { type: 'historyRetried' });
    expect(state.history).toEqual({ status: 'loading', attempt: 1 });
  });
});

describe('outbox selectors', () => {
  it('sends only the head of the queue, and only while online', () => {
    const state = enqueueAll('a', 'b');

    expect(selectNextToSend(state.comments, false)).toBeUndefined();
    expect(selectNextToSend(state.comments, true)?.clientId).toBe('a');
  });

  it('blocks everything behind a failed head', () => {
    let state = enqueueAll('a', 'b', 'c');
    state = commentsReducer(state, { type: 'sendFailed', clientId: 'a' });

    expect(selectNextToSend(state.comments, true)).toBeUndefined();
    expect(selectCommentViews(state.comments, true).map((view) => view.status)).toEqual([
      'failed',
      'blocked',
      'blocked',
    ]);
  });

  it('shows every pending comment as sending online and queued offline', () => {
    const state = enqueueAll('a', 'b');

    expect(selectCommentViews(state.comments, true).map((view) => view.status)).toEqual([
      'sending',
      'sending',
    ]);
    expect(selectCommentViews(state.comments, false).map((view) => view.status)).toEqual([
      'queued-offline',
      'queued-offline',
    ]);
  });
});
