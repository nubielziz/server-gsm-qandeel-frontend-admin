// Tells the server the staff member is typing (feature 28, rule 2): `sendTicketTyping(id, { mode })` at most once every 3 seconds, only while the draft changes and is
// not empty. The first change after a pause sends at once; changes inside the 3 seconds send nothing (they are not queued: the other side shows the line for 6 seconds
// after each ping, so steady typing keeps it on). A draft that was already there when the composer opened, a cleared box and a disabled box send nothing. A failed ping is
// ignored: typing is a courtesy and never worth an error.
import { useEffect, useRef } from 'react';
import { sendTicketTyping } from '../api';
import { TYPING_SEND_MS } from '../lib/liveTiming';
import type { TypingMode } from '../types';

export interface TypingPingArgs {
  ticketId: number;
  /** The composer's tab: a reply or an internal note. */
  mode: TypingMode;
  /** The text in the box. */
  draft: string;
  /** False when the staff member may not reply (the box is disabled). */
  enabled: boolean;
}

export function useTypingPing({ ticketId, mode, draft, enabled }: TypingPingArgs): void {
  const lastSent = useRef(Number.NEGATIVE_INFINITY);
  const previous = useRef(draft);

  useEffect(() => {
    if (draft === previous.current) return;
    previous.current = draft;
    if (!enabled || draft.trim() === '') return;
    const now = Date.now();
    if (now - lastSent.current < TYPING_SEND_MS) return;
    lastSent.current = now;
    void sendTicketTyping(ticketId, { mode }).catch(() => {});
  }, [ticketId, mode, draft, enabled]);
}
