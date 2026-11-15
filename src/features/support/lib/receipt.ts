// The "Sent" / "Seen" line under the team's last public reply (feature 28, plan §2 rule 3 and §4.1). Notes and system messages have no receipt, and the line is
// about the requester: "Seen" once the requester's mark has reached that reply, "Sent" until then.
import { fmtDate } from '@/lib/format';
import type { Id, IsoDateTime } from '@/lib/api';
import type { TicketMessage } from '../types';

export interface Receipt {
  /** The message the line sits under. */
  messageId: Id;
  seen: boolean;
  /** "Sent" or "Seen 05 Mar, 14:07" (just "Seen" when the time is not known). */
  text: string;
}

/**
 * The receipt of a thread, or null when the team has not written a public reply. `seenId` is the highest message the requester has seen
 * (`requesterSeenMessageId`) and `seenAt` the moment of that mark.
 */
export function receiptFor(
  messages: readonly TicketMessage[],
  seenId: Id | null,
  seenAt: IsoDateTime | null,
): Receipt | null {
  const last = messages.findLast((message) => message.authorType === 'staff' && !message.isInternal);
  if (!last) return null;
  const seen = seenId !== null && seenId >= last.id;
  const when = seen && seenAt ? fmtDate(seenAt) : '';
  return { messageId: last.id, seen, text: seen ? (when ? `Seen ${when}` : 'Seen') : 'Sent' };
}
