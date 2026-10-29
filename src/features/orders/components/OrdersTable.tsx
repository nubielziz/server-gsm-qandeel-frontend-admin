// OrdersTable: a self-contained list of orders for other pages (a merchant's or a customer's orders). Pass the filters that always
// apply (`fixed`) and it fetches, sorts and pages by itself; a click opens the order's drawer in the address (`?order=`), so the page
// also mounts `<OrderDrawerHost />`. The Orders page uses the same `OrderTable` with its own URL-driven state.
import { useState, type ReactNode } from 'react';
import type { SortState } from '@/components/ui';
import { useNow } from '@/lib/format';
import { useOrderDrawer } from '../hooks/useOrderDrawer';
import { useOrdersList } from '../hooks/useOrdersList';
import { NEWEST_FIRST } from '../lib/filters';
import type { OrderListFilters } from '../types';
import { OrderTable } from './OrderTable';

export interface OrdersTableProps {
  /** The filters that always apply, for example `{ clientId: 7 }` on a merchant's page. */
  fixed: OrderListFilters;
  pageSize?: number;
  caption?: string;
  /** Shown when the filters match no order. */
  empty?: ReactNode;
  /** Leave out the Buyer column when every row has the same buyer. */
  hideBuyer?: boolean;
}

export function OrdersTable({
  fixed,
  pageSize = 10,
  caption = 'Orders',
  empty,
  hideBuyer,
}: OrdersTableProps) {
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<SortState>(NEWEST_FIRST);
  const now = useNow();
  const drawer = useOrderDrawer();
  const { orders, total, query } = useOrdersList({ filters: fixed, page, pageSize, sort });

  return (
    <OrderTable
      rows={orders}
      state={query.isLoading ? 'loading' : query.isError ? 'error' : 'ready'}
      error={query.error}
      onRetry={() => void query.refetch()}
      now={now}
      sort={sort}
      onSortChange={(next) => {
        setSort(next);
        setPage(1);
      }}
      pagination={{ page, pageSize, total: total ?? orders.length }}
      onPageChange={setPage}
      onOpen={(order) => drawer.open(order.id)}
      empty={empty}
      caption={caption}
      hideBuyer={hideBuyer}
    />
  );
}
