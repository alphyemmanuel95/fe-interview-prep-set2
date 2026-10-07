import { useSyncExternalStore } from 'react';

const subscribe = (onChange: () => void): (() => void) => {
  window.addEventListener('online', onChange);
  window.addEventListener('offline', onChange);
  return () => {
    window.removeEventListener('online', onChange);
    window.removeEventListener('offline', onChange);
  };
};

const getSnapshot = (): boolean => navigator.onLine;

// Assume online during server rendering; the browser value takes over on hydration.
const getServerSnapshot = (): boolean => true;

/**
 * `navigator.onLine` as React state. `useSyncExternalStore` subscribes once per store, survives
 * StrictMode re-mounts and never tears between components reading the same value.
 */
export function useOnlineStatus(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
