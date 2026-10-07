import { createEvent, fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BOARD_STORAGE_KEY, BOARD_STORAGE_VERSION } from './hooks/useBoard';
import type { BoardState } from './model/board';
import { KanbanPage } from './KanbanPage';

// userEvent cannot drive native HTML5 drag and drop, so these tests use fireEvent with a
// stubbed DataTransfer and stubbed layout (jsdom has no layout engine).

const CARD_HEIGHT = 100;

const board: BoardState = {
  cards: {
    a: { id: 'a', title: 'Alpha', description: '' },
    b: { id: 'b', title: 'Beta', description: '' },
    c: { id: 'c', title: 'Gamma', description: '' },
  },
  columns: { todo: ['a', 'b'], inProgress: ['c'], done: [] },
};

const dataTransfer = {
  setData: vi.fn(),
  getData: vi.fn(() => ''),
  effectAllowed: 'all',
  dropEffect: 'none',
};

// Each card is CARD_HEIGHT tall and stacked by its position in its list.
function stubLayout(): void {
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (
    this: HTMLElement,
  ): DOMRect {
    const siblings = Array.from(this.parentElement?.children ?? []);
    const top = siblings.indexOf(this) * CARD_HEIGHT;
    return {
      x: 0,
      y: top,
      top,
      left: 0,
      width: 200,
      height: CARD_HEIGHT,
      right: 200,
      bottom: top + CARD_HEIGHT,
      toJSON: () => ({}),
    };
  });
}

const column = (name: RegExp): HTMLElement => screen.getByRole('region', { name });
const cardItem = (title: string): HTMLElement => {
  const item = screen.getByRole('heading', { name: title }).closest('li');
  if (item === null) {
    throw new Error(`No list item for ${title}`);
  }
  return item;
};
const titlesIn = (name: RegExp): (string | null)[] =>
  within(column(name))
    .getAllByRole('heading', { level: 3 })
    .map((heading) => heading.textContent);

// jsdom has no DragEvent, so init fields like clientY are dropped; define it on the event directly.
function fireDragAt(type: 'dragOver' | 'drop', target: HTMLElement, clientY: number): void {
  const event = createEvent[type](target, { dataTransfer });
  Object.defineProperty(event, 'clientY', { value: clientY });
  fireEvent(target, event);
}

function dragCard(title: string, to: HTMLElement, clientY: number): void {
  fireEvent.dragStart(cardItem(title), { dataTransfer });
  fireDragAt('dragOver', to, clientY);
  fireDragAt('drop', to, clientY);
}

describe('KanbanPage drag and drop', () => {
  beforeEach(() => {
    localStorage.setItem(
      BOARD_STORAGE_KEY,
      JSON.stringify({ version: BOARD_STORAGE_VERSION, data: board }),
    );
    stubLayout();
  });

  it('moves a card between columns and updates both counts', () => {
    render(<KanbanPage />);

    // Below Gamma's midpoint, so Alpha lands after it.
    dragCard('Alpha', column(/^In progress/), CARD_HEIGHT * 1.5);

    expect(screen.getByRole('heading', { name: 'To do (1)' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'In progress (2)' })).toBeInTheDocument();
    expect(titlesIn(/^In progress/)).toEqual(['Gamma', 'Alpha']);
  });

  it('reorders a card within its column', () => {
    render(<KanbanPage />);

    // Above Alpha's midpoint (Beta itself is ignored when computing the index).
    dragCard('Beta', column(/^To do/), CARD_HEIGHT * 0.25);

    expect(titlesIn(/^To do/)).toEqual(['Beta', 'Alpha']);
    expect(screen.getByRole('heading', { name: 'To do (2)' })).toBeInTheDocument();
  });
});
