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
import { useBoard } from './hooks/useBoard';
import { useCardDrag } from './hooks/useCardDrag';
import { useFocusRequest } from './hooks/useFocusRequest';
import { COLUMN_IDS, findCard } from './model/board';
import type { MoveTarget } from './model/moves';
import { describeMove, getMoveTarget } from './model/moves';
import './KanbanPage.css';

export function KanbanPage(): JSX.Element {
  const { board, dispatch } = useBoard();
  const [editingCardId, setEditingCardId] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState('');
  const requestFocus = useFocusRequest();

  const moveCard = (cardId: string, target: MoveTarget): void => {
    setAnnouncement(describeMove(board, cardId, target));
    dispatch({ type: 'move', cardId, ...target });
  };

  const { draggingCardId, dropTarget, getCardDragProps, getColumnDropProps } =
    useCardDrag(moveCard);

  const handlers: CardHandlers = {
    onAdd: (columnId, draft) => {
      // The id is created here, not in the reducer, so the reducer stays pure.
      dispatch({ type: 'add', columnId, card: { id: crypto.randomUUID(), ...draft } });
      setAnnouncement(`Added "${draft.title}".`);
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
      setAnnouncement(`Saved "${draft.title}".`);
      requestFocus(editButtonId(cardId));
    },
    onEditCancel: (cardId) => {
      setEditingCardId(null);
      requestFocus(editButtonId(cardId));
    },
    onDelete: (cardId) => {
      const location = findCard(board, cardId);
      const title = board.cards[cardId]?.title ?? 'card';
      dispatch({ type: 'delete', cardId });
      setAnnouncement(`Deleted "${title}".`);
      if (location !== undefined) {
        requestFocus(columnHeadingId(location.columnId));
      }
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
      <p className="visually-hidden" aria-live="polite">
        {announcement}
      </p>
    </section>
  );
}
