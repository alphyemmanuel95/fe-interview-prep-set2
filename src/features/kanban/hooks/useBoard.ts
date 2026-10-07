import { useEffect, useReducer } from 'react';
import { loadFromStorage, saveToStorage } from '../../../shared/storage';
import type { BoardAction, BoardState } from '../model/board';
import { boardReducer, EMPTY_BOARD, isBoardState } from '../model/board';

export const BOARD_STORAGE_KEY = 'kanban-board';
export const BOARD_STORAGE_VERSION = 1;

const loadBoard = (): BoardState =>
  loadFromStorage(BOARD_STORAGE_KEY, BOARD_STORAGE_VERSION, isBoardState, EMPTY_BOARD);

export type UseBoardResult = Readonly<{
  board: BoardState;
  dispatch: (action: BoardAction) => void;
}>;

export function useBoard(): UseBoardResult {
  // Lazy initialiser: storage is read once on mount, not on every render.
  const [board, dispatch] = useReducer(boardReducer, undefined, loadBoard);

  // Writing is idempotent, so StrictMode's double-run is harmless and there is nothing to clean up.
  useEffect(() => {
    saveToStorage(BOARD_STORAGE_KEY, BOARD_STORAGE_VERSION, board);
  }, [board]);

  return { board, dispatch };
}
