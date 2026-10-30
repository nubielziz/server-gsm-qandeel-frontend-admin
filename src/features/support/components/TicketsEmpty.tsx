// TicketsEmpty: what the list says when there are no rows: the inbox is empty, or nothing matches the filter. Ports the two
// `emptyBlock`s of pageSupport (49-p-support.js); the demo's "Simulate a ticket" button is not ported (MISMATCHES M9).
import { Button, EmptyState } from '@/components/ui';

export interface TicketsEmptyProps {
  /** No ticket exists at all (the Open, Overdue and All figures are zero and nothing is filtered). */
  inboxEmpty: boolean;
  /** Whether a filter differs from the default, so "Show open tickets" would change something. */
  filtersOn: boolean;
  onReset: () => void;
}

export function TicketsEmpty({ inboxEmpty, filtersOn, onReset }: TicketsEmptyProps) {
  if (inboxEmpty) {
    return (
      <EmptyState icon="life" title="Inbox is empty">
        Tickets from the storefront contact form, email and live chat land here, next to merchant requests.
      </EmptyState>
    );
  }
  return (
    <EmptyState
      icon="inbox"
      title="No tickets here"
      cta={filtersOn ? <Button onClick={onReset}>Show open tickets</Button> : undefined}
    >
      Nothing matches this filter.
    </EmptyState>
  );
}
