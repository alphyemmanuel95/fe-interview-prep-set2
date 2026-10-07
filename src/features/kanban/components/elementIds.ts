import type { ColumnId } from '../model/board';
import type { MoveDirection } from '../model/moves';

// Deterministic DOM ids so focus can be restored to "the same control on the same card"
// after a move re-parents it into another column.
export const cardElementId = (cardId: string): string => `kanban-card-${cardId}`;
export const editButtonId = (cardId: string): string => `kanban-card-${cardId}-edit`;
export const moveButtonId = (cardId: string, direction: MoveDirection): string =>
  `kanban-card-${cardId}-move-${direction}`;
export const columnHeadingId = (columnId: ColumnId): string => `kanban-column-${columnId}-heading`;
