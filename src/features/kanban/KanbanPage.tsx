import type { JSX } from 'react';
import { useState } from 'react';
import { Column } from './components/Column';
import type { CardHandlers } from './components/Column';
import {
  cardElementId,
  columnHeadingId,
  editButtonId,
  moveButtonId,
} from './components/elementIds';
import { useAnnouncer } from './hooks/useAnnouncer';
import { useBoard } from './hooks/useBoard';
import { useCardDrag } from './hooks/useCardDrag';
import { useFocusRequest } from './hooks/useFocusRequest';
import type { Card, ColumnId } from './model/board';
import { COLUMN_IDS, findCard, isNoopMove } from './model/board';
import type { MoveTarget } from './model/moves';
import { describeMove, getMoveTarget } from './model/moves';
import './KanbanPage.css';

type DeletedCard = Readonly<{ card: Card; columnId: ColumnId; index: number }>;

export function KanbanPage(): JSX.Element {
  const { board, dispatch } = useBoard();
  const [editingCardId, setEditingCardId] = useState<string | null>(null);
  const { announcement, announce } = useAnnouncer();
  const [lastDeleted, setLastDeleted] = useState<DeletedCard | null>(null);
  const requestFocus = useFocusRequest();

  const handleUndoDelete = (): void => {
    if (lastDeleted === null) {
      return;
    }
    dispatch({ type: 'restore', ...lastDeleted });
    setLastDeleted(null);
    announce(`Restored "${lastDeleted.card.title}".`);
    requestFocus(cardElementId(lastDeleted.card.id));
  };

  const moveCard = (cardId: string, target: MoveTarget): void => {
    // A drop back onto the card's own slot is not a move: nothing to dispatch or announce.
    if (isNoopMove(board, cardId, target.toColumn, target.toIndex)) {
      return;
    }
    announce(describeMove(board, cardId, target));
    dispatch({ type: 'move', cardId, ...target });
  };

  const { draggingCardId, dropTarget, getCardDragProps, getColumnDropProps } =
    useCardDrag(moveCard);

  const handlers: CardHandlers = {
    onAdd: (columnId, draft) => {
      // The id is created here, not in the reducer, so the reducer stays pure.
      dispatch({ type: 'add', columnId, card: { id: crypto.randomUUID(), ...draft } });
      announce(`Added "${draft.title}".`);
    },
    onMove: (cardId, direction) => {
      const target = getMoveTarget(board, cardId, direction);
      if (target === undefined) {
        return;
      }
      moveCard(cardId, target);
      // Keep focus on the same control so repeated presses keep moving the card.
      requestFocus(moveButtonId(cardId, direction), cardElementId(cardId));
    },
    onEditStart: (cardId) => {
      setEditingCardId(cardId);
    },
    onEditSave: (cardId, draft) => {
      dispatch({ type: 'edit', cardId, changes: draft });
      setEditingCardId(null);
      announce(`Saved "${draft.title}".`);
      requestFocus(editButtonId(cardId));
    },
    onEditCancel: (cardId) => {
      setEditingCardId(null);
      requestFocus(editButtonId(cardId));
    },
    onDelete: (cardId) => {
      const location = findCard(board, cardId);
      const card = board.cards[cardId];
      if (location === undefined || card === undefined) {
        return;
      }
      dispatch({ type: 'delete', cardId });
      // Undo instead of a confirm dialog: deleting stays one click and mistakes are recoverable.
      setLastDeleted({ card, columnId: location.columnId, index: location.index });
      announce(`Deleted "${card.title}".`);
      requestFocus(columnHeadingId(location.columnId));
    },
  };

  return (
    <section className="kanban" aria-labelledby="page-title">
      <h1 id="page-title" className="kanban__title">
        Kanban Board
      </h1>
      <p className="kanban__hint">
        Drag cards to move them, or use the arrow buttons on each card.
      </p>
      <div className="kanban__columns">
        {COLUMN_IDS.map((columnId) => (
          <Column
            key={columnId}
            board={board}
            columnId={columnId}
            editingCardId={editingCardId}
            draggingCardId={draggingCardId}
            dropTarget={dropTarget}
            getCardDragProps={getCardDragProps}
            dropProps={getColumnDropProps(columnId)}
            handlers={handlers}
          />
        ))}
      </div>
      <div
        className={`kanban__status${announcement.message === '' ? '' : ' kanban__status--active'}`}
      >
        <p className="kanban__announcement" aria-live="polite">
          {announcement.message !== '' && <span key={announcement.id}>{announcement.message}</span>}
        </p>
        {lastDeleted !== null && (
          <button type="button" className="kanban__undo" onClick={handleUndoDelete}>
            Undo delete
          </button>
        )}
      </div>
    </section>
  );
}
