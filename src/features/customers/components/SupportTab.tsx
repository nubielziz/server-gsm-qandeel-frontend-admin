// SupportTab: the customer's support tickets (the demo's Support tab in 48-p-customers.js), listed by the support feature's
// `CustomerTickets`, with a link to all of them on the Support page (`/support?customerId=<id>`, ARCHITECTURE §5.2).
import { EmptyState } from '@/components/ui';
import { CustomerTickets } from '@/features/support';
import type { CustomerDetail } from '../types';

export function SupportTab({ customer }: { customer: CustomerDetail }) {
  if (customer.stats.tickets === 0) {
    return (
      <EmptyState icon="life" title="No tickets">
        This customer has never contacted support.
      </EmptyState>
    );
  }
  return <CustomerTickets customerId={customer.id} />;
}
