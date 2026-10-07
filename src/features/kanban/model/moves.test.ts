import { describe, expect, it } from 'vitest';
import type { BoardState } from './board';
import { describeMove, getMoveTarget } from './moves';

const board: BoardState = {
  cards: {
    a: { id: 'a', title: 'Alpha', description: '' },
    b: { id: 'b', title: 'Beta', description: '' },
    c: { id: 'c', title: 'Gamma', description: '' },
  },
  columns: { todo: ['a', 'b'], inProgress: ['c'], done: [] },
};

describe('getMoveTarget', () => {
  it('moves to the neighbouring column at the same row', () => {
    expect(getMoveTarget(board, 'b', 'right')).toEqual({ toColumn: 'inProgress', toIndex: 1 });
  });

  it('returns undefined at the board and column edges', () => {
    expect(getMoveTarget(board, 'a', 'left')).toBeUndefined();
    expect(getMoveTarget(board, 'a', 'up')).toBeUndefined();
    expect(getMoveTarget(board, 'b', 'down')).toBeUndefined();
  });

  it('reorders within the column', () => {
    expect(getMoveTarget(board, 'b', 'up')).toEqual({ toColumn: 'todo', toIndex: 0 });
  });
});

describe('describeMove', () => {
  it('reports the column and 1-based position after the move', () => {
    expect(describeMove(board, 'a', { toColumn: 'inProgress', toIndex: 1 })).toBe(
      'Moved "Alpha" to In progress, position 2 of 2.',
    );
  });
});
