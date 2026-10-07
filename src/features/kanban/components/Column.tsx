import type { JSX } from 'react';
import type { CardDragProps, ColumnDropProps } from '../hooks/useCardDrag';
import type { BoardState, CardDraft, ColumnId } from '../model/board';
import { COLUMN_TITLES } from '../model/board';
import type { MoveDirection, MoveTarget } from '../model/moves';
import { getMoveTarget } from '../model/moves';
import { CardForm } from './CardForm';
import { CardItem } from './CardItem';
import { columnHeadingId } from './elementIds';
import './Column.css';

export type CardHandlers = Readonly<{
  onAdd: (columnId: ColumnId, draft: CardDraft) => void;
  onMove: (cardId: string, direction: MoveDirection) => void;
  onEditStart: (cardId: string) => void;
  onEditSave: (cardId: string, draft: CardDraft) => void;
  onEditCancel: (cardId: string) => void;
  onDelete: (cardId: string) => void;
}>;

type ColumnProps = Readonly<{
  board: BoardState;
  columnId: ColumnId;
  editingCardId: string | null;
  draggingCardId: string | null;
  dropTarget: MoveTarget | null;
  getCardDragProps: (cardId: string) => CardDragProps;
  dropProps: ColumnDropProps;
  handlers: CardHandlers;
}>;

export function Column({
  board,
  columnId,
  editingCardId,
  draggingCardId,
  dropTarget,
  getCardDragProps,
  dropProps,
  handlers,
}: ColumnProps): JSX.Element {
  const cardIds = board.columns[columnId];
  const title = COLUMN_TITLES[columnId];
  const dropIndex = dropTarget?.toColumn === columnId ? dropTarget.toIndex : null;
  // Drop indices ignore the dragged card (see useCardDrag), so count positions the same way.
  const visibleIds = cardIds.filter((id) => id !== draggingCardId);
  const isDropAtEnd = dropIndex !== null && dropIndex >= visibleIds.length;

  return (
    <section
      className={`kanban-column${dropIndex === null ? '' : ' kanban-column--drop-target'}`}
      aria-labelledby={columnHeadingId(columnId)}
      {...dropProps}
    >
      <h2 id={columnHeadingId(columnId)} className="kanban-column__heading" tabIndex={-1}>
        {title} <span className="kanban-column__count">({cardIds.length})</span>
      </h2>
      {cardIds.length === 0 ? (
        <p className="kanban-column__empty">No cards yet.</p>
      ) : (
        <ul className={`kanban-column__list${isDropAtEnd ? ' kanban-column__list--drop-end' : ''}`}>
          {cardIds.map((cardId) => {
            const card = board.cards[cardId];
            if (card === undefined) {
              return null;
            }
            return (
              <CardItem
                key={cardId}
                card={card}
                isEditing={editingCardId === cardId}
                isDragging={draggingCardId === cardId}
                isDropBefore={dropIndex !== null && visibleIds[dropIndex] === cardId}
                getMoveTarget={(direction) => getMoveTarget(board, cardId, direction)}
                dragProps={getCardDragProps(cardId)}
                onMove={(direction) => {
                  handlers.onMove(cardId, direction);
                }}
                onEditStart={() => {
                  handlers.onEditStart(cardId);
                }}
                onEditSave={(draft) => {
                  handlers.onEditSave(cardId, draft);
                }}
                onEditCancel={() => {
                  handlers.onEditCancel(cardId);
                }}
                onDelete={() => {
                  handlers.onDelete(cardId);
                }}
              />
            );
          })}
        </ul>
      )}
      <details className="kanban-column__add">
        <summary className="kanban-column__add-toggle">Add card</summary>
        <CardForm
          label={`Add card to ${title}`}
          submitLabel="Add card"
          onSubmit={(draft) => {
            handlers.onAdd(columnId, draft);
          }}
        />
      </details>
    </section>
  );
}
