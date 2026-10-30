// TicketControls: the priority select, the assignee select and Resolve / Reopen under the thread's title. Ports the control row of
// threadView (49-p-support.js) and the tk-prio / tk-assign / tk-resolve / tk-reopen actions. A select shows the value being saved
// until the server answers, then the server's value. Without `support:update` the controls are disabled and say why.
import { Button, Icon, SelectField, type SelectOption } from '@/components/ui';
import { useUpdateTicket } from '../hooks/useTicketMutations';
import type { SupportGrants } from '../hooks/useSupportGrants';
import { PRIORITY_OPTIONS } from '../lib/status';
import type { SupportTicketDetail, TicketPriority, UpdateTicketBody } from '../types';

export interface TicketControlsProps {
  ticket: SupportTicketDetail;
  grants: SupportGrants;
  assignees: readonly SelectOption[];
}

export function TicketControls({ ticket, grants, assignees }: TicketControlsProps) {
  const update = useUpdateTicket();
  const lock = grants.needs('support:update');
  const saving = update.isPending ? update.variables.body : undefined;
  const priority = saving?.priority ?? ticket.priority;
  const assigneeId = saving && 'assigneeId' in saving ? saving.assigneeId : ticket.assigneeId;
  const resolved = (saving?.status ?? ticket.status) === 'resolved';
  const change = (body: UpdateTicketBody) => update.mutate({ ticketId: ticket.id, body });

  return (
    <div className="mt-3 flex flex-wrap items-center gap-2">
      <SelectField
        aria-label="Priority"
        value={priority}
        options={PRIORITY_OPTIONS}
        // One change at a time: a second one would race the first.
        disabled={lock.disabled || update.isPending}
        title={lock.title}
        onChange={(event) => change({ priority: event.target.value as TicketPriority })}
      />
      <SelectField
        aria-label="Assignee"
        value={assigneeId === null ? '' : String(assigneeId)}
        options={assignees}
        // One change at a time: a second one would race the first.
        disabled={lock.disabled || update.isPending}
        title={lock.title}
        onChange={(event) =>
          change({ assigneeId: event.target.value === '' ? null : Number(event.target.value) })
        }
      />
      <span className="flex-1" />
      <Button
        disabled={lock.disabled}
        title={lock.title}
        loading={update.isPending && saving?.status !== undefined}
        onClick={() => change({ status: resolved ? 'open' : 'resolved' })}
      >
        <Icon name={resolved ? 'refresh' : 'check'} className="ic-sm" />
        {resolved ? 'Reopen' : 'Resolve'}
      </Button>
    </div>
  );
}
