import { useState } from 'react';
import { loadFromStorage, saveToStorage } from '../../../shared/storage';
import { isWidgetIdList, type WidgetId } from '../model/widgets';

const STORAGE_KEY = 'dashboard-widgets';
const STORAGE_VERSION = 1;

type UseWidgetVisibilityResult = Readonly<{
  hiddenWidgetIds: readonly WidgetId[];
  toggleWidget: (id: WidgetId) => void;
}>;

// Persists the hidden ids rather than the visible ones, so a widget added in a later release
// shows up by default instead of being silently hidden for existing users.
export function useWidgetVisibility(): UseWidgetVisibilityResult {
  const [hiddenWidgetIds, setHiddenWidgetIds] = useState<readonly WidgetId[]>(() =>
    loadFromStorage(STORAGE_KEY, STORAGE_VERSION, isWidgetIdList, []),
  );

  const toggleWidget = (id: WidgetId): void => {
    const next = hiddenWidgetIds.includes(id)
      ? hiddenWidgetIds.filter((hiddenId) => hiddenId !== id)
      : [...hiddenWidgetIds, id];
    setHiddenWidgetIds(next);
    saveToStorage(STORAGE_KEY, STORAGE_VERSION, next);
  };

  return { hiddenWidgetIds, toggleWidget };
}
