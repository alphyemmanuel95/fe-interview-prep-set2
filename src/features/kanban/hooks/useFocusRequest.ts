import { useEffect, useRef } from 'react';

export type RequestFocus = (...elementIds: readonly string[]) => void;

/**
 * Moves focus after the next commit. Moving, editing or deleting a card unmounts or re-parents
 * the focused element, so focus must be restored once React has rendered the new DOM.
 * Ids are tried in order; the first one that exists and is enabled wins (e.g. "Move right"
 * becomes disabled once a card reaches Done, so we fall back to the card itself).
 */
export function useFocusRequest(): RequestFocus {
  // A ref, not state: requesting focus must not trigger an extra render.
  const pendingRef = useRef<readonly string[] | null>(null);

  // No dependency array on purpose: it checks for a pending request after every commit.
  useEffect(() => {
    const pending = pendingRef.current;
    if (pending === null) {
      return;
    }
    pendingRef.current = null;
    const target = pending
      .map((id) => document.getElementById(id))
      .find((element) => element !== null && !element.matches(':disabled'));
    target?.focus();
  });

  return (...elementIds) => {
    pendingRef.current = elementIds;
  };
}
