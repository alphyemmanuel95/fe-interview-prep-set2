import { loadFromStorage, saveToStorage } from '../../../shared/storage';
import type { Comment, UnsentComment } from './commentsReducer';
import { selectUnsent } from './commentsReducer';

export const OUTBOX_STORAGE_KEY = 'comments-outbox';
export const OUTBOX_STORAGE_VERSION = 1;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const isUnsentComment = (value: unknown): value is UnsentComment =>
  isRecord(value) &&
  typeof value['clientId'] === 'string' &&
  typeof value['text'] === 'string' &&
  typeof value['createdAt'] === 'string' &&
  (value['status'] === 'pending' || value['status'] === 'failed');

const isOutbox = (value: unknown): value is readonly UnsentComment[] =>
  Array.isArray(value) && value.every(isUnsentComment);

export const loadOutbox = (): readonly UnsentComment[] =>
  loadFromStorage(OUTBOX_STORAGE_KEY, OUTBOX_STORAGE_VERSION, isOutbox, []);

// Sent comments live on the server; only what still needs sending (or a retry) is persisted.
export const saveOutbox = (comments: readonly Comment[]): void => {
  saveToStorage(OUTBOX_STORAGE_KEY, OUTBOX_STORAGE_VERSION, selectUnsent(comments));
};
