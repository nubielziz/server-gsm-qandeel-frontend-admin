// TicketThread: the right-hand pane: the header with its controls, who wrote and the order, the conversation, and the composer (or the
// resolved notice). Ports `threadView` of 49-p-support.js. It reads the ticket by id, so a link works whatever the list shows, and
// it shows its own loading, error and not-found states.
import { EmptyState, ErrorState, Skeleton } from '@/components/ui';
import { useOrderDrawer } from '@/features/orders';
import { isApiError } from '@/lib/api';
import { useNow } from '@/lib/format';
import { useAssignees } from '../hooks/useAssignees';
import type { ComposerState } from '../hooks/useComposerState';
import type { SupportGrants } from '../hooks/useSupportGrants';
import { useTemplates } from '../hooks/useTemplates';
import { useTicket, useTicketOrder } from '../hooks/useTicket';
import { templatesFor } from '../lib/macros';
import { Composer } from './Composer';
import { MessageList } from './MessageList';
import { ResolvedNotice } from './ResolvedNotice';
import { ThreadHeader } from './ThreadHeader';
import { ThreadParties } from './ThreadParties';

export interface TicketThreadProps {
  id: number;
  grants: SupportGrants;
  composer: ComposerState;
  /** The ticket was just chosen on a wide screen: put the cursor in the composer. */
  focusComposer: boolean;
  onBack: () => void;
}

function ThreadSkeleton() {
  return (
    <div className="space-y-3 p-3.5" role="status" aria-label="Loading the ticket">
      <span className="sr-only">Loading…</span>
      <Skeleton width="60%" height={16} />
      <Skeleton width="35%" height={10} />
      <Skeleton height={120} />
    </div>
  );
}

export function TicketThread({ id, grants, composer, focusComposer, onBack }: TicketThreadProps) {
  const now = useNow();
  const { ticket, query } = useTicket(id);
  const { order } = useTicketOrder(ticket?.orderId ?? null);
  const { templates } = useTemplates({ enabled: grants.ready });
  const assignees = useAssignees(grants, ticket?.assignee ?? null);
  const drawer = useOrderDrawer();

  if (query.isError && !ticket) {
    if (isApiError(query.error) && query.error.status === 404) {
      return (
        <EmptyState icon="mail" title="Ticket not found">
          No ticket has that ID. It may have been removed.
        </EmptyState>
      );
    }
    return (
      <ErrorState
        title="Could not load the ticket"
        error={query.error}
        onRetry={() => void query.refetch()}
      />
    );
  }
  if (!ticket) return <ThreadSkeleton />;

  return (
    <div className="flex h-full flex-col">
      <ThreadHeader ticket={ticket} grants={grants} assignees={assignees} now={now} onBack={onBack} />
      <ThreadParties ticket={ticket} order={order} />
      <MessageList messages={ticket.messages} />
      {ticket.status === 'resolved' ? (
        <ResolvedNotice rating={ticket.csatScore} />
      ) : (
        <Composer
          key={ticket.id}
          ticket={ticket}
          order={order}
          templates={templatesFor(templates, ticket.category)}
          grants={grants}
          state={composer}
          focusOnMount={focusComposer}
          onOpenOrder={drawer.open}
        />
      )}
    </div>
  );
}
