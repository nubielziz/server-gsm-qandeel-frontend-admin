// OrdersPart: the "Orders" part of an account's record: the orders feature's own table, filtered to this account and without the Buyer
// column (every row has the same buyer), so orders look and behave the same on every page. A click opens the order's drawer in the address
// (`?order=<id>`), which this part mounts with `OrderDrawerHost`. The part is read-only: nothing here changes an account.
import { EmptyState } from '@/components/ui';
import { OrderDrawerHost, OrdersTable } from '@/features/orders';
import { accountLabel } from '../shared/accountLabel';
import type { AccountPartProps } from '../types';
import { ordersEmpty } from './ordersText';

/**
 * The account's orders, newest first, ten to a page, with the order drawer. The part is offered only with `orders:read` (the registry's
 * rule), so it asks for nothing a role may not read. An address with `?order=<id>` and no `tab` opens this part with that order's drawer.
 */
export function OrdersPart({ account }: AccountPartProps) {
  const empty = ordersEmpty(account);
  return (
    <div className="view-frame">
      <div>
        <OrdersTable
          fixed={{ accountId: account.id }}
          hideBuyer
          caption={`Orders of ${accountLabel(account)}`}
          empty={
            <EmptyState icon="orders" title={empty.title}>
              {empty.text}
            </EmptyState>
          }
        />
      </div>
      <OrderDrawerHost />
    </div>
  );
}
