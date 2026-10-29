// OrdersPage: the orders queue (`/orders`, the demo's `pageOrders` in 41-p-orders.js). A header with the open and past-SLA counts, tabs
// with counts, a toolbar of filters, a bulk bar, the table, and the order drawer. Tab, filters, page and sort live in the address
// (`?tab=review&q=…`), the open order in `?order=<id>`. The page only composes; the server filters, sorts and counts.
import { useState } from 'react';
import { Panel, SectionTabs, usePageClamp, type TabItem } from '@/components/ui';
import { useNow } from '@/lib/format';
import { BulkBar } from '../components/BulkBar';
import { BulkSummaryDialog } from '../components/BulkSummaryDialog';
import { OrderDialogs } from '../components/OrderDialogs';
import type { OrderDialogState } from '../components/orderDialogState';
import { OrderDrawerHost } from '../components/OrderDrawerHost';
import { OrderRowMenu } from '../components/OrderRowMenu';
import { OrdersEmpty } from '../components/OrdersEmpty';
import { OrdersHeader } from '../components/OrdersHeader';
import { OrderTable } from '../components/OrderTable';
import { OrdersToolbar } from '../components/OrdersToolbar';
import { useBulkSend } from '../hooks/useBulkSend';
import { useClientOptions, useSupplierOptions } from '../hooks/useLookups';
import { useOrderCounts } from '../hooks/useOrderCounts';
import { useOrderDrawer } from '../hooks/useOrderDrawer';
import { useOrderExport } from '../hooks/useOrderExport';
import { useOrderGrants } from '../hooks/useOrderGrants';
import { useDispatchOrder } from '../hooks/useOrderMutations';
import { useOrderSelection } from '../hooks/useOrderSelection';
import { useOrderShortcuts } from '../hooks/useOrderShortcuts';
import { useOrderView } from '../hooks/useOrderView';
import { useOrdersList } from '../hooks/useOrdersList';
import type { BulkSummary } from '../lib/bulk';
import { hasActiveFilters, PAGE_SIZE, toListFilters, type OrderFilters } from '../lib/filters';
import { ORDER_TABS } from '../lib/status';
import type { Order } from '../types';

export function OrdersPage() {
  const grants = useOrderGrants();
  const view = useOrderView();
  const now = useNow();
  const drawer = useOrderDrawer();
  const [dialog, setDialog] = useState<OrderDialogState | null>(null);
  const [summary, setSummary] = useState<BulkSummary | null>(null);
  const [cursor, setCursor] = useState<number | null>(null);

  const listFilters = toListFilters(view.filters);
  const list = useOrdersList({
    filters: listFilters,
    page: view.page,
    pageSize: PAGE_SIZE,
    sort: view.sort,
    enabled: grants.ready,
  });
  // A shrinking list (a bulk action, the refresh, an old link) must not leave the table on an empty page.
  usePageClamp({
    page: view.page,
    pageSize: PAGE_SIZE,
    total: list.total,
    settled: list.query.isSuccess && !list.query.isPlaceholderData,
    setPage: view.setPage,
  });
  const counts = useOrderCounts(grants.ready);
  const picked = useOrderSelection(list.orders);
  const exporter = useOrderExport();
  const retry = useDispatchOrder();
  const suppliers = useSupplierOptions(grants.can('suppliers:read'));
  const clients = useClientOptions(grants.can('clients:read'));

  const open = (order: Order) => {
    setCursor(order.id);
    drawer.open(order.id);
  };
  useOrderShortcuts({
    ids: list.orders.map((order) => order.id),
    cursor,
    setCursor,
    open: drawer.open,
    toggle: (id) => picked.selection.toggle(id),
  });

  // Ticks are cleared when the list changes under them, so no order is acted on out of sight.
  const changeFilters = (patch: Partial<OrderFilters>) => {
    picked.selection.clear();
    view.setFilters(patch);
  };
  const clearFilters = () => {
    picked.selection.clear();
    view.clearFilters();
  };

  // An action ended: untick the orders it covered (all the ticked ones for the bulk bar, only that order for a row
  // menu, so other ticks survive) and tell what was refused.
  const finished = (result: BulkSummary, covered: readonly Order[] = picked.orders) => {
    picked.selection.setMany(
      covered.map((order) => order.id),
      false,
    );
    if (result.failed.length > 0) setSummary(result);
  };
  const bulk = useBulkSend(finished);

  const tabItems: TabItem<(typeof ORDER_TABS)[number]['id']>[] = ORDER_TABS.map((tab) => ({
    value: tab.id,
    label: tab.label,
    count: counts.tabs[tab.id],
  }));
  const filtersOn = hasActiveFilters(view.filters);
  const noOrders = counts.tabs.all === 0 || (view.filters.tab === 'all' && !filtersOn && list.total === 0);

  return (
    <>
      <OrdersHeader
        grants={grants}
        open={counts.tabs.open}
        pastSla={counts.pastSla}
        canExport={(list.total ?? 0) > 0}
        exporting={exporter.isPending}
        onBulkReply={() => setDialog({ kind: 'bulk-reply' })}
        onExport={() =>
          exporter.mutate({
            filters: listFilters,
            sort: view.sort,
            tab: view.filters.tab,
            total: list.total ?? list.orders.length,
          })
        }
      />
      <Panel flush>
        <SectionTabs
          items={tabItems}
          value={view.filters.tab}
          onChange={(tab) => changeFilters({ tab })}
          label="Order status"
        />
        <OrdersToolbar
          filters={view.filters}
          onChange={changeFilters}
          onClear={clearFilters}
          total={list.total}
          suppliers={grants.can('suppliers:read') ? (suppliers.data ?? []) : undefined}
          clients={grants.can('clients:read') ? (clients.data ?? []) : undefined}
        />
        <BulkBar
          orders={picked.orders}
          grants={grants}
          suppliers={(suppliers.data ?? []).filter((supplier) => supplier.enabled !== false)}
          progress={bulk.progress}
          onComplete={() => setDialog({ kind: 'complete', orders: picked.orders })}
          onRetry={() => void bulk.send(picked.orders)}
          onReroute={(supplier) => void bulk.send(picked.orders, supplier)}
          onReject={() => setDialog({ kind: 'reject', orders: picked.orders })}
          onClear={() => picked.selection.clear()}
        />
        <div className="border-t border-line">
          <OrderTable
            rows={list.orders}
            state={list.query.isLoading ? 'loading' : list.query.isError ? 'error' : 'ready'}
            error={list.query.error}
            onRetry={() => void list.query.refetch()}
            tab={view.filters.tab}
            now={now}
            sort={view.sort}
            onSortChange={view.setSort}
            pagination={{ page: view.page, pageSize: PAGE_SIZE, total: list.total ?? list.orders.length }}
            onPageChange={view.setPage}
            selection={picked.selection}
            cursorKey={cursor ?? undefined}
            onOpen={open}
            empty={
              <OrdersEmpty
                tab={view.filters.tab}
                filtersOn={filtersOn}
                noOrders={noOrders}
                onClear={clearFilters}
              />
            }
            menu={(order) => (
              <OrderRowMenu
                order={order}
                grants={grants}
                onOpen={open}
                onComplete={(target) => setDialog({ kind: 'complete', orders: [target] })}
                onReject={(target) => setDialog({ kind: 'reject', orders: [target] })}
                onRetry={(target) => retry.mutate(target)}
                onRefund={(target) => setDialog({ kind: 'refund', order: target })}
                sending={retry.isPending}
              />
            )}
          />
        </div>
      </Panel>
      <OrderDrawerHost rows={list.orders} />
      <OrderDialogs dialog={dialog} onChange={setDialog} onBulkDone={finished} />
      {summary && <BulkSummaryDialog summary={summary} onClose={() => setSummary(null)} />}
    </>
  );
}
