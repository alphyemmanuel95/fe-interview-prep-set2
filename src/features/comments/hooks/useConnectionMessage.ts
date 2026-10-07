import { useState } from 'react';
import { plural } from '../model/text';

export type ConnectionMessage = Readonly<{ tone: 'offline' | 'online' | 'idle'; text: string }>;

const OFFLINE_TEXT =
  'You’re offline. New comments are queued and sent automatically when you reconnect.';

/**
 * Text for the always-mounted connection status region. "Back online" is a transition, not a
 * state, so the previous online value is tracked during render (React's recommended pattern for
 * reacting to a changed value) instead of in an effect, which would render once with stale text.
 */
export function useConnectionMessage(isOnline: boolean, sendingCount: number): ConnectionMessage {
  const [previousIsOnline, setPreviousIsOnline] = useState(isOnline);
  const [sendingAtReconnect, setSendingAtReconnect] = useState<number | null>(null);

  if (previousIsOnline !== isOnline) {
    setPreviousIsOnline(isOnline);
    setSendingAtReconnect(isOnline ? sendingCount : null);
  } else if (sendingAtReconnect !== null && sendingCount === 0) {
    // The reconnect backlog is done; later posts shouldn't revive the "Back online" message.
    setSendingAtReconnect(null);
  }

  if (!isOnline) {
    return { tone: 'offline', text: OFFLINE_TEXT };
  }
  if (sendingAtReconnect !== null && sendingAtReconnect > 0) {
    return {
      tone: 'online',
      text: `Back online. Sending ${plural(sendingAtReconnect, 'comment')}.`,
    };
  }
  return { tone: 'idle', text: '' };
}
