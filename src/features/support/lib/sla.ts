// The reply timers as the inbox and the thread print them. Ports the "Reply overdue by …" line of ticketRow() and the
// "Waiting … for a reply" line of threadView() (49-p-support.js). This is display maths only: the server decides whether a ticket
// is late (`late`) and when the reply is due (`slaDueAt`); the console subtracts two times to draw a sentence.
import type { SupportTicket } from '../types';

type Timers = Pick<SupportTicket, 'late' | 'slaDueAt' | 'lastPublicAt'>;

/** How long ago the reply became due, or null when the ticket is not late (or the server sent no deadline). */
export function overdueMs(ticket: Timers, now: number): number | null {
  if (!ticket.late || !ticket.slaDueAt) return null;
  return Math.max(0, now - Date.parse(ticket.slaDueAt));
}

/** How long the customer has waited since the last message they could see, or null when the ticket is not late. */
export function waitingMs(ticket: Timers, now: number): number | null {
  if (!ticket.late || !ticket.lastPublicAt) return null;
  return Math.max(0, now - Date.parse(ticket.lastPublicAt));
}

/** The reply target for the ticket's priority: the time between the last message and the deadline, or null when unknown. */
export function targetMs(ticket: Timers): number | null {
  if (!ticket.slaDueAt || !ticket.lastPublicAt) return null;
  return Math.max(0, Date.parse(ticket.slaDueAt) - Date.parse(ticket.lastPublicAt));
}
