// Ticket rules the dashboard mock needs: which tickets wait for a reply and which are late. Ports ticketWaiting, ticketLate,
// lastPublic and supportStats of 12-state-b2c.js.
import { HOUR } from './util';
import type { SeedTicket, World } from './world';

// How long a customer may wait for an answer, by ticket priority (PRIO_TARGET in 09-b2c-data.js).
const TARGET: Record<SeedTicket['prio'], number> = { high: 2 * HOUR, normal: 8 * HOUR, low: 24 * HOUR };

/** The last message the customer could see (internal notes are not). */
export function lastPublic(ticket: SeedTicket): SeedTicket['msgs'][number] | null {
  return [...ticket.msgs].reverse().find((message) => message.by !== 'note') ?? null;
}

/** Open, and the customer spoke last. */
export function isWaiting(ticket: SeedTicket): boolean {
  return ticket.status !== 'resolved' && lastPublic(ticket)?.by === 'customer';
}

export function isLate(ticket: SeedTicket, now: number): boolean {
  const last = lastPublic(ticket);
  return isWaiting(ticket) && last !== null && now - last.ts > TARGET[ticket.prio];
}

/** Open tickets and the late ones among them (the sidebar's Support count). */
export function supportCounts(world: World): { open: number; late: number } {
  const open = world.tickets.filter((ticket) => ticket.status !== 'resolved');
  return { open: open.length, late: open.filter((ticket) => isLate(ticket, world.now)).length };
}
