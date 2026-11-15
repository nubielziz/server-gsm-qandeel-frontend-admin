// The rules of the support alerts (feature 28, plan §2 rule 5), kept apart from the hook so they can be tested without a browser: which ticket events
// alert whom, what the desktop notification says, and how to tell a ticket that has just been opened.
import type { SupportTicket } from '../types';

/** A requester's message waits this long for the `ticket.updated` that follows it (it names the assignee and the number) before the alert goes out without it. */
export const PENDING_ROW_MS = 3_000;
/** A ticket is "new" for the alert when it was opened at most this long ago (by the server's clock; a skewed clock only costs the alert of a ticket that arrives without a message). */
export const NEW_TICKET_WINDOW_MS = 15_000;
/** How many message ids the alert remembers, so one message alerts once however often it arrives. */
export const REMEMBERED_ALERTS = 100;

/**
 * Does this ticket's requester deserve an alert for the staff member `meId`? A ticket assigned to a colleague does not (they have it), one assigned to me
 * or to nobody does. `null` (the row is not known) alerts: a missed customer is worse than a beep for a colleague's ticket.
 */
export function wantsAlert(row: Pick<SupportTicket, 'assigneeId'> | null, meId: number | undefined): boolean {
  if (row === null) return true;
  return row.assigneeId === null || row.assigneeId === meId;
}

/**
 * True for a row that is a ticket the requester has just opened and nobody has touched: status `new`, created a moment ago, never updated since. A
 * `ticket.updated` for such a row is the new-ticket alert when no message event came with it.
 */
export function isFreshTicket(
  row: Pick<SupportTicket, 'status' | 'createdAt' | 'updatedAt'>,
  now: number,
): boolean {
  const created = Date.parse(row.createdAt);
  const updated = Date.parse(row.updatedAt);
  if (row.status !== 'new' || Number.isNaN(created) || Number.isNaN(updated)) return false;
  return now - created < NEW_TICKET_WINDOW_MS && Math.abs(updated - created) < 2_000;
}

/** The desktop notification's words: the ticket number and the requester's name, never the message text (nothing private on a lock screen). */
export function alertText(row: Pick<SupportTicket, 'number' | 'requester'> | null): {
  title: string;
  body: string;
} {
  if (row === null) return { title: 'New message on a support ticket', body: '' };
  return { title: `New message on ${row.number}`, body: row.requester.name };
}
