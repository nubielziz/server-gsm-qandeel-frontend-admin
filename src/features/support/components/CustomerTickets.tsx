// CustomerTickets: one customer's tickets as a short list (subject, status, last activity), each opening that ticket's thread on the
// Support page. Exported for the customer page's Support tab, which today only links to the inbox. It reads the tickets itself
// and shows its own loading, error and empty states, so a page can drop it in with a customer id.
import { Link } from 'react-router';
import { ButtonLink, EmptyState, ErrorState, Icon, SkeletonTable } from '@/components/ui';
import { useMe } from '@/features/auth';
import { ago, num, useNow } from '@/lib/format';
import { hasPermission } from '@/lib/auth/permissions';
import { CUSTOMER_TICKET_LIMIT, useCustomerTickets } from '../hooks/useCustomerTickets';
import { supportListPath, supportTicketPath } from '../lib/filters';
import { TicketStatusBadge } from './TicketStatusBadge';

export function CustomerTickets({ customerId }: { customerId: number }) {
  const { data: me } = useMe();
  const now = useNow();
  const allowed = me !== undefined && hasPermission(me.permissions, 'support:read');
  const { tickets, total, query } = useCustomerTickets(customerId, allowed);

  if (me && !allowed) {
    return (
      <EmptyState icon="life" title="Tickets are hidden">
        You need the support:read permission to see this customer’s tickets.
      </EmptyState>
    );
  }
  if (query.isLoading || !me) return <SkeletonTable cols={3} rows={3} />;
  if (query.isError) {
    return (
      <ErrorState
        title="Could not load the tickets"
        error={query.error}
        onRetry={() => void query.refetch()}
      />
    );
  }
  if (tickets.length === 0) {
    return (
      <EmptyState icon="life" title="No tickets">
        This customer has never contacted support.
      </EmptyState>
    );
  }
  const more = total !== undefined && total > CUSTOMER_TICKET_LIMIT;
  return (
    <div>
      <ul className="m-0 list-none divide-y divide-line p-0" aria-label="Tickets">
        {tickets.map((ticket) => (
          <li key={ticket.id}>
            <Link
              className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3.5 py-2.5 hover:bg-hover"
              to={supportTicketPath(ticket.id)}
            >
              <span className="min-w-0 flex-1 truncate text-sm font-medium">{ticket.subject}</span>
              <TicketStatusBadge status={ticket.status} />
              <span className="flex-none text-xs text-ink3">{ago(ticket.updatedAt, now)}</span>
            </Link>
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap items-center gap-3 border-t border-line p-3.5">
        <p className="min-w-0 flex-1 text-sm text-ink2">
          {more
            ? `Showing the latest ${CUSTOMER_TICKET_LIMIT} of ${num(total)} tickets.`
            : `${num(total ?? tickets.length)} ${(total ?? tickets.length) === 1 ? 'ticket' : 'tickets'}.`}
        </p>
        <ButtonLink to={supportListPath({ customerId })}>
          <Icon name="life" className="ic-sm" />
          Open in Support
        </ButtonLink>
      </div>
    </div>
  );
}
