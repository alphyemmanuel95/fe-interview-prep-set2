import { describe, expect, it } from 'vitest';
import type { BoardState, Card } from './board';
import { boardReducer, EMPTY_BOARD, isBoardState } from './board';

const card = (id: string): Card => ({ id, title: `Card ${id}`, description: '' });

const seeded: BoardState = {
  cards: { a: card('a'), b: card('b'), c: card('c'), d: card('d') },
  columns: { todo: ['a', 'b', 'c'], inProgress: ['d'], done: [] },
};

describe('boardReducer', () => {
  it('adds a card to the end of the chosen column', () => {
    const next = boardReducer(EMPTY_BOARD, { type: 'add', card: card('x'), columnId: 'done' });

    expect(next.columns.done).toEqual(['x']);
    expect(next.cards['x']).toEqual(card('x'));
  });

  it('moves a card between columns, updating both lists and their counts', () => {
    const next = boardReducer(seeded, {
      type: 'move',
      cardId: 'b',
      toColumn: 'inProgress',
      toIndex: 0,
    });

    expect(next.columns.todo).toEqual(['a', 'c']);
    expect(next.columns.inProgress).toEqual(['b', 'd']);
    expect(next.columns.todo).toHaveLength(2);
    expect(next.columns.inProgress).toHaveLength(2);
  });

  it('reorders within a column', () => {
    const next = boardReducer(seeded, { type: 'move', cardId: 'a', toColumn: 'todo', toIndex: 2 });

    expect(next.columns.todo).toEqual(['b', 'c', 'a']);
  });

  it('returns the same board when a card is dropped back onto its own position', () => {
    expect(boardReducer(seeded, { type: 'move', cardId: 'b', toColumn: 'todo', toIndex: 1 })).toBe(
      seeded,
    );
    expect(boardReducer(seeded, { type: 'move', cardId: 'c', toColumn: 'todo', toIndex: 99 })).toBe(
      seeded,
    );
  });

  it('clamps an out-of-range index to the end of the column', () => {
    const next = boardReducer(seeded, { type: 'move', cardId: 'a', toColumn: 'done', toIndex: 99 });

    expect(next.columns.done).toEqual(['a']);
  });

  it('edits a card without moving it', () => {
    const next = boardReducer(seeded, {
      type: 'edit',
      cardId: 'b',
      changes: { title: 'Renamed', description: 'Details' },
    });

    expect(next.cards['b']).toEqual({ id: 'b', title: 'Renamed', description: 'Details' });
    expect(next.columns).toBe(seeded.columns);
  });

  it('deletes a card from both the card map and its column', () => {
    const next = boardReducer(seeded, { type: 'delete', cardId: 'd' });

    expect(next.columns.inProgress).toEqual([]);
    expect(next.cards['d']).toBeUndefined();
  });

  it('restores a deleted card to its original column and position', () => {
    const deleted = boardReducer(seeded, { type: 'delete', cardId: 'b' });
    const restored = boardReducer(deleted, {
      type: 'restore',
      card: card('b'),
      columnId: 'todo',
      index: 1,
    });

    expect(restored).toEqual(seeded);
  });
});

describe('isBoardState', () => {
  it('accepts a valid board', () => {
    expect(isBoardState(seeded)).toBe(true);
  });

  it('rejects a column that references a missing card', () => {
    expect(isBoardState({ ...seeded, columns: { ...seeded.columns, done: ['ghost'] } })).toBe(
      false,
    );
  });

  it('rejects inherited keys such as "toString" as card ids', () => {
    expect(isBoardState({ ...seeded, columns: { ...seeded.columns, done: ['toString'] } })).toBe(
      false,
    );
  });

  it('rejects an id that appears in more than one column', () => {
    expect(isBoardState({ ...seeded, columns: { ...seeded.columns, done: ['a'] } })).toBe(false);
  });

  it('rejects a card stored under a key that differs from its id', () => {
    expect(isBoardState({ ...seeded, cards: { ...seeded.cards, a: card('z') } })).toBe(false);
  });

  it('rejects a card that is not placed in any column', () => {
    expect(isBoardState({ ...seeded, cards: { ...seeded.cards, e: card('e') } })).toBe(false);
  });

  it('rejects malformed data', () => {
    expect(isBoardState({ cards: [], columns: {} })).toBe(false);
    expect(isBoardState(null)).toBe(false);
  });
});
