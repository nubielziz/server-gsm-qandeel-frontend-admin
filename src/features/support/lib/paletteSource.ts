// The command palette's ticket search: type a ticket number or a subject and get up to three tickets, each opening its thread on the
// Support page. Ports the Tickets group of paletteItems(q) in 90-app.js; the server does the matching (`q` on
// `GET /admin/support-tickets`) instead of the browser scanning every ticket.
import type { PaletteSource } from '@/app/palette';
import { listSupportTickets } from '../api';
import { supportTicketPath } from './filters';

/** Most tickets the palette lists (the demo's limit). */
export const PALETTE_TICKET_LIMIT = 3;

export const supportPaletteSource: PaletteSource = {
  id: 'support',
  group: 'Tickets',
  permission: 'support:read',
  async search(query, signal, go) {
    const { data } = await listSupportTickets(
      { q: query.trim(), start: 0, end: PALETTE_TICKET_LIMIT, sort: ['updatedAt'], order: ['desc'] },
      { signal },
    );
    return data.map((ticket) => ({
      id: `ticket:${ticket.id}`,
      label: `${ticket.number}  ${ticket.subject}`,
      hint: ticket.requester.name,
      icon: 'life' as const,
      // The demo showed All tickets so the one opened is in the list whatever its status.
      run: () => go(supportTicketPath(ticket.id, 'all')),
    }));
  },
};
