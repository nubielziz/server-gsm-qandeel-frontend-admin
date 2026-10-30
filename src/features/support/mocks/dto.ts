// Turns a stored mock ticket into what the API sends. The timers are worked out here, at read time, the way the real server would:
// a reply is awaited when the last message the customer could see came from the customer's side and the ticket is not resolved; it is
// due after the target of the ticket's priority (2h high, 8h normal, 24h low, the demo's `PRIO_TARGET`) and late once that has passed.
import { toIso } from '@/mocks/seed';
import type { SupportTicket, SupportTicketDetail, TicketMessage, TicketPriority } from '../types';
import type { MockTicket } from './types';

const HOUR_MS = 3_600_000;
const TARGET_MS: Record<TicketPriority, number> = {
  high: 2 * HOUR_MS,
  normal: 8 * HOUR_MS,
  low: 24 * HOUR_MS,
};

/** The newest message the customer could see (the demo's `lastPublic`). */
function lastPublic(messages: readonly TicketMessage[]): TicketMessage | undefined {
  return messages.findLast((message) => !message.isInternal);
}

/** The list row: the stored fields without the thread, plus the three timers. */
export function toTicket(row: MockTicket, now = Date.now()): SupportTicket {
  const { messages, replyChannels: _channels, ...rest } = row;
  const last = lastPublic(messages);
  const waiting =
    row.status !== 'resolved' &&
    last !== undefined &&
    (last.authorType === 'customer' || last.authorType === 'client');
  const due = waiting && last ? Date.parse(last.createdAt) + TARGET_MS[row.priority] : null;
  return {
    ...rest,
    lastPublicAt: last?.createdAt ?? null,
    slaDueAt: due === null ? null : toIso(due),
    late: due !== null && now > due,
  };
}

/** The ticket with its whole thread. */
export function toDetail(row: MockTicket): SupportTicketDetail {
  return {
    ...toTicket(row),
    messages: row.messages.map((message) => ({ ...message })),
    replyChannels: row.replyChannels,
  };
}
