import { useSyncExternalStore } from 'react';

function subscribe(onChange: () => void): () => void {
  document.addEventListener('visibilitychange', onChange);
  return () => {
    document.removeEventListener('visibilitychange', onChange);
  };
}

const getIsVisible = (): boolean => document.visibilityState === 'visible';

/** Page visibility read straight from the browser — derived, never copied into state. */
export function useDocumentVisibility(): boolean {
  return useSyncExternalStore(subscribe, getIsVisible);
}
