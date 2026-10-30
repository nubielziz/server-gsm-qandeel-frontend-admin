// SupportStats: the figures above the inbox: open tickets (and how many nobody has answered), tickets past the reply target, and
// resolved ones. Ports the `statGrid` of pageSupport (49-p-support.js). The demo's median first reply and satisfaction need
// numbers the API does not give (MISMATCHES M145), so they are left out. The server counts; this only prints.
import { StatGrid } from '@/components/ui';
import { num } from '@/lib/format';
import type { TicketCounts } from '../hooks/useTicketCounts';

const show = (count: number | undefined) => (count === undefined ? '–' : num(count));

export function SupportStats({ counts }: { counts: TicketCounts }) {
  return (
    <StatGrid
      label="Support figures"
      cells={[
        {
          label: 'Open tickets',
          value: show(counts.open),
          sub:
            counts.unanswered === undefined ? undefined : `${num(counts.unanswered)} new, not yet answered`,
        },
        {
          label: 'Past reply target',
          value: show(counts.late),
          className: counts.late ? 'text-crit-fg' : undefined,
          sub: 'Targets: 2h high, 8h normal, 24h low',
          tip: 'A ticket is late when the customer wrote last and nobody replied within the target for its priority.',
        },
        {
          label: 'Resolved',
          value: show(counts.resolved),
          sub: 'Customers rate a ticket when it is resolved',
        },
      ]}
    />
  );
}
