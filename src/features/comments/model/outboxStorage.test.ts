import { describe, expect, it } from 'vitest';
import type { Comment } from './commentsReducer';
import { loadOutbox, OUTBOX_STORAGE_KEY, saveOutbox } from './outboxStorage';

const base = { text: 'Hi', createdAt: '2026-10-07T10:00:00.000Z' };

describe('outboxStorage', () => {
  it('round-trips unsent comments and drops sent ones', () => {
    const comments: readonly Comment[] = [
      { ...base, clientId: 'a', status: 'sent', serverId: 's-1' },
      { ...base, clientId: 'b', status: 'pending' },
      { ...base, clientId: 'c', status: 'failed' },
    ];

    saveOutbox(comments);

    expect(loadOutbox()).toEqual([comments[1], comments[2]]);
  });

  it('falls back to an empty outbox for invalid data', () => {
    localStorage.setItem(
      OUTBOX_STORAGE_KEY,
      JSON.stringify({ version: 1, data: [{ clientId: 1 }] }),
    );

    expect(loadOutbox()).toEqual([]);
  });
});
