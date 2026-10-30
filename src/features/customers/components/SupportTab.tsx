// SupportTab: how many tickets the customer opened, and a link to them in the Support page (`/support?customerId=<id>`, a deep
// link of ARCHITECTURE §5.2). The demo listed the tickets here; the support feature is not built yet and will embed its list.
import { ButtonLink, EmptyState, Icon } from '@/components/ui';
import type { CustomerDetail } from '../types';

export function SupportTab({ customer }: { customer: CustomerDetail }) {
  const tickets = customer.stats.tickets;
  if (tickets === 0) {
    return (
      <EmptyState icon="life" title="No tickets">
        This customer has never contacted support.
      </EmptyState>
    );
  }
  return (
    <div className="flex flex-wrap items-center gap-3 p-3.5">
      <p className="min-w-0 flex-1 text-sm">
        {tickets} support {tickets === 1 ? 'ticket' : 'tickets'} from this customer.
      </p>
      <ButtonLink to={`/support?customerId=${customer.id}`}>
        <Icon name="life" className="ic-sm" />
        Open in Support
      </ButtonLink>
    </div>
  );
}
