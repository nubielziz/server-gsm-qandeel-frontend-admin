// OrdersTab: the customer's orders, as the orders feature's own table with this customer fixed as the filter. Ports the
// Orders tab of pageCustomer in 48-p-customers.js; the buyer column is left out because every row has the same buyer.
// Clicking a row opens the order's drawer in the address (`?order=`), which the page's `OrderDrawerHost` shows.
import { EmptyState } from '@/components/ui';
import { OrdersTable } from '@/features/orders';
import type { CustomerGrants } from '../hooks/useCustomerGrants';
import type { CustomerDetail } from '../types';

export function OrdersTab({ customer, grants }: { customer: CustomerDetail; grants: CustomerGrants }) {
  // The orders route needs orders:read; say so instead of asking for a list the server would refuse.
  if (!grants.can('orders:read')) {
    return (
      <EmptyState icon="lock" title="Orders are hidden for your role">
        You need the orders:read permission to see what this customer bought.
      </EmptyState>
    );
  }
  return (
    <OrdersTable
      fixed={{ customerId: customer.id }}
      hideBuyer
      caption="Orders by this customer"
      empty={
        <EmptyState icon="orders" title="No orders">
          This customer has not bought anything yet.
        </EmptyState>
      }
    />
  );
}
