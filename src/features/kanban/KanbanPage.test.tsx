import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { BOARD_STORAGE_KEY, BOARD_STORAGE_VERSION } from './hooks/useBoard';
import type { BoardState } from './model/board';
import { KanbanPage } from './KanbanPage';

const seededBoard: BoardState = {
  cards: {
    a: { id: 'a', title: 'Write spec', description: '' },
    b: { id: 'b', title: 'Review PR', description: 'Before lunch' },
  },
  columns: { todo: ['a', 'b'], inProgress: [], done: [] },
};

function seedStorage(board: BoardState): void {
  localStorage.setItem(
    BOARD_STORAGE_KEY,
    JSON.stringify({ version: BOARD_STORAGE_VERSION, data: board }),
  );
}

const column = (name: RegExp): HTMLElement => screen.getByRole('region', { name });

describe('KanbanPage', () => {
  it('moves a card with the keyboard and updates both columns and counts', async () => {
    seedStorage(seededBoard);
    const user = userEvent.setup();
    render(<KanbanPage />);

    expect(screen.getByRole('heading', { name: 'To do (2)' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'In progress (0)' })).toBeInTheDocument();

    const moveRight = screen.getByRole('button', { name: 'Move "Write spec" right' });
    moveRight.focus();
    await user.keyboard('{Enter}');

    expect(screen.getByRole('heading', { name: 'To do (1)' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'In progress (1)' })).toBeInTheDocument();
    expect(within(column(/^In progress/)).getByText('Write spec')).toBeInTheDocument();
    expect(within(column(/^To do/)).queryByText('Write spec')).not.toBeInTheDocument();
    // Focus follows the card so the user can keep pressing the same control.
    expect(screen.getByRole('button', { name: 'Move "Write spec" right' })).toHaveFocus();
    expect(screen.getByText('Moved "Write spec" to In progress, position 1 of 1.')).toBeVisible();
  });

  it('adds, edits and deletes a card, requiring a title', async () => {
    const user = userEvent.setup();
    render(<KanbanPage />);
    const todo = column(/^To do/);

    await user.click(within(todo).getByText('Add card', { selector: 'summary' }));
    const form = within(todo).getByRole('form', { name: 'Add card to To do' });
    await user.click(within(form).getByRole('button', { name: 'Add card' }));
    expect(within(form).getByText('Title is required.')).toBeInTheDocument();

    await user.type(within(form).getByLabelText(/Title/), '  Ship it  ');
    await user.click(within(form).getByRole('button', { name: 'Add card' }));
    expect(screen.getByRole('heading', { name: 'To do (1)' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Ship it' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Edit "Ship it"' }));
    const editForm = screen.getByRole('form', { name: 'Edit "Ship it"' });
    const titleInput = within(editForm).getByLabelText(/Title/);
    expect(titleInput).toHaveFocus();
    await user.clear(titleInput);
    await user.type(titleInput, 'Ship it today{Enter}');
    expect(screen.getByRole('heading', { name: 'Ship it today' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Delete "Ship it today"' }));
    expect(screen.getByRole('heading', { name: 'To do (0)' })).toBeInTheDocument();
  });

  it('restores the board from localStorage after a remount', async () => {
    seedStorage(seededBoard);
    const user = userEvent.setup();
    const { unmount } = render(<KanbanPage />);

    await user.click(screen.getByRole('button', { name: 'Move "Review PR" up' }));
    unmount();
    render(<KanbanPage />);

    const titles = within(column(/^To do/))
      .getAllByRole('heading', { level: 3 })
      .map((heading) => heading.textContent);
    expect(titles).toEqual(['Review PR', 'Write spec']);
  });

  it('falls back to an empty board when stored data is corrupt', () => {
    localStorage.setItem(BOARD_STORAGE_KEY, '{not json');
    render(<KanbanPage />);

    expect(screen.getByRole('heading', { name: 'To do (0)' })).toBeInTheDocument();
  });
});
