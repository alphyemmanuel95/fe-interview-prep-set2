import type { JSX } from 'react';
import type { CardDragProps } from '../hooks/useCardDrag';
import type { Card, CardDraft } from '../model/board';
import type { MoveDirection } from '../model/moves';
import { MOVE_DIRECTIONS } from '../model/moves';
import { CardForm } from './CardForm';
import { cardElementId, editButtonId, moveButtonId } from './elementIds';
import './CardItem.css';

const MOVE_LABELS = {
  left: { symbol: '←', text: 'left' },
  right: { symbol: '→', text: 'right' },
  up: { symbol: '↑', text: 'up' },
  down: { symbol: '↓', text: 'down' },
} as const satisfies Record<MoveDirection, { symbol: string; text: string }>;

type CardItemProps = Readonly<{
  card: Card;
  isEditing: boolean;
  isDragging: boolean;
  isDropBefore: boolean;
  canMove: (direction: MoveDirection) => boolean;
  dragProps: CardDragProps;
  onMove: (direction: MoveDirection) => void;
  onEditStart: () => void;
  onEditSave: (draft: CardDraft) => void;
  onEditCancel: () => void;
  onDelete: () => void;
}>;

export function CardItem({
  card,
  isEditing,
  isDragging,
  isDropBefore,
  canMove,
  dragProps,
  onMove,
  onEditStart,
  onEditSave,
  onEditCancel,
  onDelete,
}: CardItemProps): JSX.Element {
  const className = [
    'kanban-card',
    isDragging && 'kanban-card--dragging',
    isDropBefore && 'kanban-card--drop-before',
  ]
    .filter(Boolean)
    .join(' ');

  if (isEditing) {
    return (
      <li className={className} data-card-id={card.id}>
        <CardForm
          label={`Edit "${card.title}"`}
          submitLabel="Save"
          initialDraft={card}
          shouldAutoFocus
          onSubmit={onEditSave}
          onCancel={onEditCancel}
        />
      </li>
    );
  }

  return (
    <li className={className} data-card-id={card.id} {...dragProps}>
      <article id={cardElementId(card.id)} className="kanban-card__body" tabIndex={-1}>
        <h3 className="kanban-card__title">{card.title}</h3>
        {card.description !== '' && <p className="kanban-card__description">{card.description}</p>}
        <div className="kanban-card__actions">
          <button
            id={editButtonId(card.id)}
            type="button"
            className="kanban-card__button"
            aria-label={`Edit "${card.title}"`}
            onClick={onEditStart}
          >
            Edit
          </button>
          <button
            type="button"
            className="kanban-card__button kanban-card__button--danger"
            aria-label={`Delete "${card.title}"`}
            onClick={onDelete}
          >
            Delete
          </button>
          <div className="kanban-card__moves" role="group" aria-label={`Move "${card.title}"`}>
            {MOVE_DIRECTIONS.map((direction) => (
              <button
                key={direction}
                id={moveButtonId(card.id, direction)}
                type="button"
                className="kanban-card__button kanban-card__button--icon"
                aria-label={`Move "${card.title}" ${MOVE_LABELS[direction].text}`}
                title={`Move ${MOVE_LABELS[direction].text}`}
                disabled={!canMove(direction)}
                onClick={() => {
                  onMove(direction);
                }}
              >
                <span aria-hidden="true">{MOVE_LABELS[direction].symbol}</span>
              </button>
            ))}
          </div>
        </div>
      </article>
    </li>
  );
}
