// CustomerLink: a customer's name that links to their page. Ports the demo's `custLink`. A person who cannot open the
// Customers page sees the name as text, because the link would only lead to a no-access page.
import { Link } from 'react-router';
import type { NamedRef } from '@/features/orders';
import { useCanOpenPage } from '@/lib/auth/useCanOpenPage';

export function CustomerLink({ customer }: { customer: NamedRef | null }) {
  const canOpen = useCanOpenPage('customers');
  if (!customer) return <span className="text-ink3">Unknown</span>;
  if (canOpen === false) return <span>{customer.name}</span>;
  return (
    <Link className="link" to={`/customers/${customer.id}`}>
      {customer.name}
    </Link>
  );
}
