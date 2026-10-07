import { describe, expect, it } from 'vitest';
import type { Comment, CommentsState } from './commentsReducer';
import {
  commentsReducer,
  createInitialState,
  getDisplayStatus,
  selectNextToSend,
} from './commentsReducer';

const draft = (clientId: string): Omit<Comment, 'status'> => ({
  clientId,
  text: `Comment ${clientId}`,
  createdAt: '2026-10-07T10:00:00.000Z',
});

const enqueueAll = (...clientIds: string[]): CommentsState =>
  clientIds.reduce(
    (state, clientId) => commentsReducer(state, { type: 'enqueue', comment: draft(clientId) }),
    createInitialState([]),
  );

describe('commentsReducer', () => {
  it('enqueues new comments as pending, in order', () => {
    const state = enqueueAll('a', 'b');

    expect(state.comments.map((comment) => [comment.clientId, comment.status])).toEqual([
      ['a', 'pending'],
      ['b', 'pending'],
    ]);
  });

  it('marks a pending comment sent or failed', () => {
    let state = enqueueAll('a', 'b');
    state = commentsReducer(state, { type: 'sendSucceeded', clientId: 'a', serverId: 's-1' });
    state = commentsReducer(state, { type: 'sendFailed', clientId: 'b' });

    expect(state.comments).toEqual([
      { ...draft('a'), status: 'sent', serverId: 's-1' },
      { ...draft('b'), status: 'failed' },
    ]);
  });

  it('ignores a late result for a comment that is no longer pending', () => {
    let state = enqueueAll('a');
    state = commentsReducer(state, { type: 'sendSucceeded', clientId: 'a', serverId: 's-1' });
    const after = commentsReducer(state, { type: 'sendFailed', clientId: 'a' });

    expect(after).toEqual(state);
  });

  it('moves a retried comment to the back of the queue', () => {
    let state = enqueueAll('a', 'b');
    state = commentsReducer(state, { type: 'sendFailed', clientId: 'a' });
    state = commentsReducer(state, { type: 'retry', clientId: 'a' });

    expect(state.comments.map((comment) => [comment.clientId, comment.status])).toEqual([
      ['b', 'pending'],
      ['a', 'pending'],
    ]);
  });

  it('merges server history and drops local copies the server already has', () => {
    let state = enqueueAll('a', 'b');
    state = commentsReducer(state, { type: 'sendFailed', clientId: 'a' });
    state = commentsReducer(state, {
      type: 'historyLoaded',
      comments: [{ ...draft('a'), id: 's-1' }],
    });

    expect(state.history).toBe('loaded');
    expect(state.comments.map((comment) => [comment.clientId, comment.status])).toEqual([
      ['a', 'sent'],
      ['b', 'pending'],
    ]);
  });
});

describe('selectNextToSend / getDisplayStatus', () => {
  it('sends the oldest pending comment only while online', () => {
    let state = enqueueAll('a', 'b');
    state = commentsReducer(state, { type: 'sendFailed', clientId: 'a' });

    expect(selectNextToSend(state.comments, false)).toBeUndefined();
    const next = selectNextToSend(state.comments, true);
    expect(next?.clientId).toBe('b');
    expect(state.comments.map((comment) => getDisplayStatus(comment, next?.clientId))).toEqual([
      'failed',
      'sending',
    ]);
  });
});
