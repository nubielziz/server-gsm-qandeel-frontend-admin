// ThreadHeader: the top of the thread pane: the subject, the number, how it arrived, its category, when it was opened and its status;
// the controls; and, for a ticket past its reply target, how long the customer has waited. Ports the first block of threadView
// (49-p-support.js). The back arrow only shows on a phone, where the thread replaces the list.
import { Button, Icon } from '@/components/ui';
import { ageText, ago } from '@/lib/format';
import { targetMs, waitingMs } from '../lib/sla';
import { CATEGORY_LABEL, CHANNEL_LABEL } from '../lib/status';
import type { SelectOption } from '@/components/ui';
import type { SupportGrants } from '../hooks/useSupportGrants';
import type { SupportTicketDetail } from '../types';
import { TicketControls } from './TicketControls';
import { TicketStatusBadge } from './TicketStatusBadge';

export interface ThreadHeaderProps {
  ticket: SupportTicketDetail;
  grants: SupportGrants;
  assignees: readonly SelectOption[];
  now: number;
  onBack: () => void;
}

export function ThreadHeader({ ticket, grants, assignees, now, onBack }: ThreadHeaderProps) {
  const waiting = waitingMs(ticket, now);
  const target = targetMs(ticket);
  return (
    <div className="border-b border-line p-3.5">
      <div className="flex items-start gap-2">
        <Button
          variant="ghost"
          size="sm"
          icon
          className="-ms-1 lg:hidden"
          aria-label="Back to the list"
          onClick={onBack}
        >
          <Icon name="chevL" />
        </Button>
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-semibold leading-tight">{ticket.subject}</h2>
          <p className="mt-0.5 text-xs text-ink3">
            <span className="mono">{ticket.number}</span> · {CHANNEL_LABEL[ticket.channel]} ·{' '}
            {CATEGORY_LABEL[ticket.category]} · opened {ago(ticket.createdAt, now)}
          </p>
        </div>
        <TicketStatusBadge status={ticket.status} />
      </div>
      <TicketControls ticket={ticket} grants={grants} assignees={assignees} />
      {waiting !== null && (
        <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-crit-fg">
          <Icon name="clock" className="ic-sm" />
          Waiting {ageText(waiting)} for a reply.
          {target !== null && ` The target for ${ticket.priority} priority is ${ageText(target)}.`}
        </p>
      )}
    </div>
  );
}
