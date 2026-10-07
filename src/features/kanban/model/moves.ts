import { assertNever } from '../../../shared/assertNever';
import type { BoardState, ColumnId } from './board';
import { COLUMN_IDS, COLUMN_TITLES, findCard } from './board';

export type MoveDirection = 'left' | 'right' | 'up' | 'down';

export const MOVE_DIRECTIONS = [
  'left',
  'right',
  'up',
  'down',
] as const satisfies readonly MoveDirection[];

export type MoveTarget = Readonly<{ toColumn: ColumnId; toIndex: number }>;

/** Where a keyboard/menu move lands, or `undefined` when the card is already at that edge. */
export function getMoveTarget(
  board: BoardState,
  cardId: string,
  direction: MoveDirection,
): MoveTarget | undefined {
  const location = findCard(board, cardId);
  if (location === undefined) {
    return undefined;
  }
  const { columnId, index } = location;
  const columnPosition = COLUMN_IDS.indexOf(columnId);
  switch (direction) {
    case 'left':
    case 'right': {
      const neighbour = COLUMN_IDS[columnPosition + (direction === 'left' ? -1 : 1)];
      // Keep the same row so the card stays roughly where the user's eye is.
      return neighbour === undefined ? undefined : { toColumn: neighbour, toIndex: index };
    }
    case 'up':
      return index === 0 ? undefined : { toColumn: columnId, toIndex: index - 1 };
    case 'down':
      return index === board.columns[columnId].length - 1
        ? undefined
        : { toColumn: columnId, toIndex: index + 1 };
    default:
      return assertNever(direction);
  }
}

/** Screen-reader message for a move, computed from the board *before* the move. */
export function describeMove(board: BoardState, cardId: string, target: MoveTarget): string {
  const card = board.cards[cardId];
  const from = findCard(board, cardId);
  if (card === undefined || from === undefined) {
    return '';
  }
  const otherCards = board.columns[target.toColumn].filter((id) => id !== cardId).length;
  const total = otherCards + 1;
  const position = Math.min(Math.max(target.toIndex, 0), otherCards) + 1;
  return `Moved "${card.title}" to ${COLUMN_TITLES[target.toColumn]}, position ${String(position)} of ${String(total)}.`;
}
