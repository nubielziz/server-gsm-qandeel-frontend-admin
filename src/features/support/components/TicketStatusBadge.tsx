// TicketStatusBadge: the state of a ticket as a badge (icon + word). Ports ticketBadge of 12-state-b2c.js; the inbox rows, the thread
// header and the customer page's ticket list use it.
import { Badge } from '@/components/ui';
import { STATUS_BADGE } from '../lib/status';
import type { TicketStatus } from '../types';

export function TicketStatusBadge({ status }: { status: TicketStatus }) {
  const { label, tone, icon } = STATUS_BADGE[status];
  return (
    <Badge tone={tone} icon={icon}>
      {label}
    </Badge>
  );
}
