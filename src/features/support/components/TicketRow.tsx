// TicketRow: one ticket in the inbox list: who wrote (a Merchant tag for a merchant), when, the subject, the number, the status
// badge, High priority and how long the reply is overdue. Ports ticketRow() of 49-p-support.js. The whole row opens the thread.
import { Badge, cx, Icon, TypeTag } from '@/components/ui';
import { ageText, ago } from '@/lib/format';
import { overdueMs } from '../lib/sla';
import type { SupportTicket } from '../types';
import { TicketStatusBadge } from './TicketStatusBadge';

export interface TicketRowProps {
  ticket: SupportTicket;
  selected: boolean;
  now: number;
  onSelect: (id: number) => void;
}

export function TicketRow({ ticket, selected, now, onSelect }: TicketRowProps) {
  const overdue = overdueMs(ticket, now);
  return (
    <li>
      <button
        type="button"
        className={cx(
          'block w-full border-s-2 px-3.5 py-2.5 text-start hover:bg-hover',
          selected ? 'border-accent bg-accent-soft' : 'border-transparent',
        )}
        aria-current={selected ? 'true' : undefined}
        onClick={() => onSelect(ticket.id)}
      >
        <div className="flex items-center gap-2">
          <span className="inline-flex min-w-0 items-center gap-1.5 text-sm font-medium">
            {ticket.requesterType === 'client' && <TypeTag>Merchant</TypeTag>}
            <span className="truncate">{ticket.requester.name}</span>
          </span>
          <span className="flex-1" />
          <span className={cx('flex-none text-xs', ticket.late ? 'font-medium text-crit-fg' : 'text-ink3')}>
            {ticket.late && <Icon name="clock" className="ic-xs me-1 inline" />}
            {ago(ticket.updatedAt, now)}
          </span>
        </div>
        <p className={cx('mt-0.5 truncate text-sm', ticket.status === 'new' ? 'font-medium' : 'text-ink2')}>
          {ticket.subject}
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-ink3">
          <span className="mono">{ticket.number}</span>
          <TicketStatusBadge status={ticket.status} />
          {ticket.priority === 'high' && (
            <Badge tone="crit" icon="alert">
              High
            </Badge>
          )}
          {overdue !== null && (
            <span className="font-medium text-crit-fg">Reply overdue by {ageText(overdue)}</span>
          )}
        </div>
      </button>
    </li>
  );
}
