import type { DragEvent } from 'react';
import { useState } from 'react';
import type { ColumnId } from '../model/board';
import type { MoveTarget } from '../model/moves';

type DragState = Readonly<{ cardId: string; target: MoveTarget | null }>;

export type CardDragProps = Readonly<{
  draggable: boolean;
  onDragStart: (event: DragEvent<HTMLElement>) => void;
  onDragEnd: () => void;
}>;

export type ColumnDropProps = Readonly<{
  onDragOver: (event: DragEvent<HTMLElement>) => void;
  onDragLeave: (event: DragEvent<HTMLElement>) => void;
  onDrop: (event: DragEvent<HTMLElement>) => void;
}>;

export type UseCardDragResult = Readonly<{
  draggingCardId: string | null;
  dropTarget: MoveTarget | null;
  getCardDragProps: (cardId: string) => CardDragProps;
  getColumnDropProps: (columnId: ColumnId) => ColumnDropProps;
}>;

// Drop index = number of (non-dragged) cards whose vertical midpoint is above the pointer.
// The dragged card is skipped because the reducer interprets `toIndex` against the column
// without it, so reordering within a column needs no off-by-one correction.
function getDropIndex(column: HTMLElement, pointerY: number, draggedCardId: string): number {
  const cards = Array.from(column.querySelectorAll<HTMLElement>('[data-card-id]')).filter(
    (element) => element.dataset['cardId'] !== draggedCardId,
  );
  const index = cards.findIndex((element) => {
    const rect = element.getBoundingClientRect();
    return pointerY < rect.top + rect.height / 2;
  });
  return index === -1 ? cards.length : index;
}

/** Native HTML5 drag and drop: prop getters for draggable cards and droppable columns. */
export function useCardDrag(
  onDrop: (cardId: string, target: MoveTarget) => void,
): UseCardDragResult {
  const [drag, setDrag] = useState<DragState | null>(null);

  const getCardDragProps = (cardId: string): CardDragProps => ({
    draggable: true,
    onDragStart: (event) => {
      // Firefox will not start a drag without data.
      event.dataTransfer.setData('text/plain', cardId);
      event.dataTransfer.effectAllowed = 'move';
      setDrag({ cardId, target: null });
    },
    onDragEnd: () => {
      setDrag(null);
    },
  });

  const getColumnDropProps = (columnId: ColumnId): ColumnDropProps => ({
    onDragOver: (event) => {
      // Only accept drags that started on this board (not files or text from elsewhere).
      if (drag === null) {
        return;
      }
      event.preventDefault();
      event.dataTransfer.dropEffect = 'move';
      const toIndex = getDropIndex(event.currentTarget, event.clientY, drag.cardId);
      // dragover fires continuously; only re-render when the indicator actually moves.
      if (drag.target?.toColumn !== columnId || drag.target.toIndex !== toIndex) {
        setDrag({ cardId: drag.cardId, target: { toColumn: columnId, toIndex } });
      }
    },
    onDragLeave: (event) => {
      // dragleave also fires when crossing into a child; ignore those.
      if (
        event.relatedTarget instanceof Node &&
        event.currentTarget.contains(event.relatedTarget)
      ) {
        return;
      }
      setDrag((current) => (current === null ? null : { cardId: current.cardId, target: null }));
    },
    onDrop: (event) => {
      if (drag === null) {
        return;
      }
      event.preventDefault();
      const toIndex = getDropIndex(event.currentTarget, event.clientY, drag.cardId);
      setDrag(null);
      onDrop(drag.cardId, { toColumn: columnId, toIndex });
    },
  });

  return {
    draggingCardId: drag?.cardId ?? null,
    dropTarget: drag?.target ?? null,
    getCardDragProps,
    getColumnDropProps,
  };
}
