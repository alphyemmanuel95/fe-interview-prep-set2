import { useCallback, useRef, useState } from 'react';
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

  // Mirrors state so the stable handler can compute the next value outside the (pure) updater
  // and persist it on the toggle path only; mounting never writes back what it just loaded.
  const hiddenWidgetIdsRef = useRef(hiddenWidgetIds);

  // Stable identity (no dependencies) so the memoized toggles don't re-render on every poll.
  const toggleWidget = useCallback((id: WidgetId): void => {
    const current = hiddenWidgetIdsRef.current;
    const next = current.includes(id)
      ? current.filter((hiddenId) => hiddenId !== id)
      : [...current, id];
    hiddenWidgetIdsRef.current = next;
    setHiddenWidgetIds(next);
    saveToStorage(STORAGE_KEY, STORAGE_VERSION, next);
  }, []);

  return { hiddenWidgetIds, toggleWidget };
}
