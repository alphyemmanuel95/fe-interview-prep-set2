import { useEffect } from 'react';

// Sets the tab title while the calling route is mounted and restores the previous one on leave.
export function useDocumentTitle(title: string): void {
  useEffect(() => {
    const previousTitle = document.title;
    document.title = title;
    return () => {
      document.title = previousTitle;
    };
  }, [title]);
}
