import { useCallback, useEffect, useState } from 'react';
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

  // Persisting is a side effect, so it lives here rather than inside the (pure) state updater.
  useEffect(() => {
    saveToStorage(STORAGE_KEY, STORAGE_VERSION, hiddenWidgetIds);
  }, [hiddenWidgetIds]);

  // Stable identity (functional update, no dependencies) so the memoized toggles don't
  // re-render on every poll.
  const toggleWidget = useCallback((id: WidgetId): void => {
    setHiddenWidgetIds((current) =>
      current.includes(id) ? current.filter((hiddenId) => hiddenId !== id) : [...current, id],
    );
  }, []);

  return { hiddenWidgetIds, toggleWidget };
}
