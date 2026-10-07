import { assertNever } from '../../../shared/assertNever';

export const COLUMN_IDS = ['todo', 'inProgress', 'done'] as const;

export type ColumnId = (typeof COLUMN_IDS)[number];

export const COLUMN_TITLES = {
  todo: 'To do',
  inProgress: 'In progress',
  done: 'Done',
} as const satisfies Record<ColumnId, string>;

export type Card = Readonly<{
  id: string;
  title: string;
  description: string;
}>;

// Columns hold ordered ids only; card data lives once in `cards`, so a move never copies a card
// and an edit never has to find which column the card is in.
export type BoardState = Readonly<{
  cards: Readonly<Record<string, Card>>;
  columns: Readonly<Record<ColumnId, readonly string[]>>;
}>;

export type CardDraft = Readonly<{ title: string; description: string }>;

export type BoardAction =
  | { type: 'add'; card: Card; columnId: ColumnId }
  | { type: 'edit'; cardId: string; changes: CardDraft }
  | { type: 'delete'; cardId: string }
  | { type: 'move'; cardId: string; toColumn: ColumnId; toIndex: number };

export const EMPTY_BOARD: BoardState = {
  cards: {},
  columns: { todo: [], inProgress: [], done: [] },
};

export type CardLocation = Readonly<{ columnId: ColumnId; index: number }>;

export function findCard(board: BoardState, cardId: string): CardLocation | undefined {
  for (const columnId of COLUMN_IDS) {
    const index = board.columns[columnId].indexOf(cardId);
    if (index !== -1) {
      return { columnId, index };
    }
  }
  return undefined;
}

const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max);

function moveCard(
  board: BoardState,
  cardId: string,
  toColumn: ColumnId,
  toIndex: number,
): BoardState {
  const from = findCard(board, cardId);
  if (from === undefined) {
    return board;
  }
  // Remove first, then insert: `toIndex` is interpreted against the target column *without* the
  // card, which makes same-column reorders and cross-column moves use one code path.
  const columns = {
    ...board.columns,
    [from.columnId]: board.columns[from.columnId].filter((id) => id !== cardId),
  };
  const target = [...columns[toColumn]];
  target.splice(clamp(toIndex, 0, target.length), 0, cardId);
  return { ...board, columns: { ...columns, [toColumn]: target } };
}

// Pure: ids and timestamps are created by the caller, so the reducer is deterministic,
// StrictMode's double-invoke is harmless and tests need no mocking.
export function boardReducer(board: BoardState, action: BoardAction): BoardState {
  switch (action.type) {
    case 'add':
      return {
        cards: { ...board.cards, [action.card.id]: action.card },
        columns: {
          ...board.columns,
          [action.columnId]: [...board.columns[action.columnId], action.card.id],
        },
      };
    case 'edit': {
      const card = board.cards[action.cardId];
      if (card === undefined) {
        return board;
      }
      return { ...board, cards: { ...board.cards, [card.id]: { ...card, ...action.changes } } };
    }
    case 'delete': {
      const location = findCard(board, action.cardId);
      if (location === undefined) {
        return board;
      }
      const cards = Object.fromEntries(
        Object.entries(board.cards).filter(([id]) => id !== action.cardId),
      );
      return {
        cards,
        columns: {
          ...board.columns,
          [location.columnId]: board.columns[location.columnId].filter(
            (id) => id !== action.cardId,
          ),
        },
      };
    }
    case 'move':
      return moveCard(board, action.cardId, action.toColumn, action.toIndex);
    default:
      return assertNever(action);
  }
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isCard = (value: unknown): value is Card =>
  isRecord(value) &&
  typeof value['id'] === 'string' &&
  typeof value['title'] === 'string' &&
  typeof value['description'] === 'string';

const isStringArray = (value: unknown): value is readonly string[] =>
  Array.isArray(value) && value.every((item) => typeof item === 'string');

// Shape check plus referential integrity: every column id must point at a stored card,
// otherwise rendering would hit a dangling id.
export function isBoardState(value: unknown): value is BoardState {
  if (!isRecord(value) || !isRecord(value['cards']) || !isRecord(value['columns'])) {
    return false;
  }
  const { cards, columns } = value;
  if (!Object.values(cards).every(isCard)) {
    return false;
  }
  return COLUMN_IDS.every((columnId) => {
    const ids = columns[columnId];
    return isStringArray(ids) && ids.every((id) => id in cards);
  });
}
