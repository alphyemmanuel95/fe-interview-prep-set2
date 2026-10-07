import type { JSX } from 'react';
import type { CardDragProps } from '../hooks/useCardDrag';
import type { Card, CardDraft } from '../model/board';
import { COLUMN_TITLES } from '../model/board';
import type { MoveDirection, MoveTarget } from '../model/moves';
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

// Cross-column buttons name their destination: "right" is wrong once columns stack on mobile.
function getMoveLabel(
  cardTitle: string,
  direction: MoveDirection,
  target: MoveTarget | undefined,
): string {
  const isCrossColumn = direction === 'left' || direction === 'right';
  return isCrossColumn && target !== undefined
    ? `Move "${cardTitle}" to ${COLUMN_TITLES[target.toColumn]}`
    : `Move "${cardTitle}" ${MOVE_LABELS[direction].text}`;
}

type CardItemProps = Readonly<{
  card: Card;
  isEditing: boolean;
  isDragging: boolean;
  isDropBefore: boolean;
  getMoveTarget: (direction: MoveDirection) => MoveTarget | undefined;
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
  getMoveTarget,
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
            {MOVE_DIRECTIONS.map((direction) => {
              const target = getMoveTarget(direction);
              return (
                <button
                  key={direction}
                  id={moveButtonId(card.id, direction)}
                  type="button"
                  className="kanban-card__button kanban-card__button--icon"
                  aria-label={getMoveLabel(card.title, direction, target)}
                  disabled={target === undefined}
                  onClick={() => {
                    onMove(direction);
                  }}
                >
                  <span aria-hidden="true">{MOVE_LABELS[direction].symbol}</span>
                </button>
              );
            })}
          </div>
        </div>
      </article>
    </li>
  );
}
