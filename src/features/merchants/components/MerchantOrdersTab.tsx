// MerchantOrdersTab: the "Orders" tab of a merchant's page. Ports merOrdersTab of 42-p-merchants.js with the orders feature's own
// table (filtered to this merchant, without the Buyer column). A click opens the order's drawer in the address (`?order=<id>`),
// which the page mounts with `OrderDrawerHost`.
import { EmptyState } from '@/components/ui';
import { OrdersTable } from '@/features/orders';
import type { Client } from '../types';

/** The Orders tab: the orders feature's own table, filtered to this merchant, so orders look and behave the same on every page. */
export function MerchantOrdersTab({ client }: { client: Pick<Client, 'id' | 'name' | 'status'> }) {
  return (
    <OrdersTable
      fixed={{ clientId: client.id }}
      hideBuyer
      caption={`Orders of ${client.name}`}
      empty={
        <EmptyState icon="orders" title="No orders from this merchant">
          {client.status === 'pending'
            ? 'Orders appear after the account is approved and funded.'
            : 'Orders show here as soon as they place one.'}
        </EmptyState>
      }
    />
  );
}
