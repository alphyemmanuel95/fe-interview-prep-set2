import { useCallback } from 'react';

// Start fetching well before the user hits the bottom so the next page is usually ready in time.
const PREFETCH_MARGIN = '400px';

type SentinelRef = (node: HTMLElement | null) => (() => void) | undefined;

// A ref callback (React 19 cleanup form) rather than useRef + useEffect: the sentinel mounts only
// while the feed is idle, and each mount gets a fresh observer, which reports its initial state.
// So if a short page leaves the sentinel on screen, the next page still loads.
export function useIntersectionSentinel(onIntersect: () => void): SentinelRef {
  return useCallback(
    (node: HTMLElement | null) => {
      if (!node) {
        return undefined;
      }
      const observer = new IntersectionObserver(
        (entries) => {
          if (entries.some((entry) => entry.isIntersecting)) {
            onIntersect();
          }
        },
        { rootMargin: PREFETCH_MARGIN },
      );
      observer.observe(node);
      return () => {
        observer.disconnect();
      };
    },
    [onIntersect],
  );
}
