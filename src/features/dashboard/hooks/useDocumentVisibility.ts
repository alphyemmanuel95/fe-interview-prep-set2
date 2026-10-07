import { useSyncExternalStore } from 'react';

function subscribe(onChange: () => void): () => void {
  document.addEventListener('visibilitychange', onChange);
  return () => {
    document.removeEventListener('visibilitychange', onChange);
  };
}

const getIsVisible = (): boolean => document.visibilityState === 'visible';

// Without a document (server rendering) assume visible, so polling starts once hydrated.
const getServerIsVisible = (): boolean => true;

/** Page visibility read straight from the browser — derived, never copied into state. */
export function useDocumentVisibility(): boolean {
  return useSyncExternalStore(subscribe, getIsVisible, getServerIsVisible);
}
