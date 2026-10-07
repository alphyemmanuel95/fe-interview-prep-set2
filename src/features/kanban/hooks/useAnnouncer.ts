import { useState } from 'react';

export type Announcement = Readonly<{ id: number; message: string }>;

export type UseAnnouncerResult = Readonly<{
  announcement: Announcement;
  announce: (message: string) => void;
}>;

/**
 * Messages for an `aria-live` region. The id increments on every call so the caller can key the
 * message node: screen readers ignore a text update that leaves the content unchanged, so a
 * fresh node makes "Moved X…" read again when the same move is repeated.
 */
export function useAnnouncer(): UseAnnouncerResult {
  const [announcement, setAnnouncement] = useState<Announcement>({ id: 0, message: '' });

  const announce = (message: string): void => {
    setAnnouncement((current) => ({ id: current.id + 1, message }));
  };

  return { announcement, announce };
}
