// PricingView: the price grid of the services of one kind (the second link of the page). A Quick Search box, then a grid in the list skin: per
// service the cost, the supplier's price, the base price, the shop price and one price per rank, every figure the server's. The
// prices are typed in place and saved by the bar at the foot, row by row; "Display Enable/Disable Service" and "Set Order" add a box per row.
// With "Set Order" on, the services of one chosen group (all of them on the page) can also be dragged to a new place by their grip (decision 038).
import { useEffect, useState } from 'react';
import { Button, FooterPager, UnsavedGuard, usePageClamp } from '@/components/ui';
import { BulkPriceDialog } from '../../BulkPriceDialog';
import { useCategories, useGroupOptions } from '../../../hooks/useChoices';
import { usePriceGrid } from '../../../hooks/usePriceGrid';
import { useSetGridStatus } from '../../../hooks/useSetGridStatus';
import { gridQuery } from '../../../lib/priceGrid';
import type { PriceGridRow } from '../../../types';
import { SortableTable } from '../../sortable';
import type { ProductsViewProps } from '../types';
import { priceColumns, type Lock } from './priceColumns';
import { PricingEmpty } from './PricingEmpty';
import { PricingSearch } from './PricingSearch';
import { usePriceEdits } from './usePriceEdits';
import { usePricingAddress } from './usePricingAddress';
import { usePricingSave } from './usePricingSave';
import { useServiceDrag } from './useServiceDrag';

const RETAIL_GROUP_KIND = 'b2c_retail';

/** The lock of a box that needs the rank list (the shop price is sent back with every rank price). */
function groupsLock(canEdit: Lock, canRead: boolean, loaded: boolean, failed: boolean): Lock {
  if (canEdit.disabled) return canEdit;
  if (!canRead) return { disabled: true, title: 'You need the groups:read permission' };
  if (failed) return { disabled: true, title: 'The ranks could not be read' };
  return loaded ? { disabled: false } : { disabled: true, title: 'Reading the ranks' };
}

/** The Pricing view. */
export function PricingView({ type, grants }: ProductsViewProps) {
  const address = usePricingAddress(type);
  const [display, setDisplay] = useState(false);
  const [ordering, setOrdering] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const { q, group, page, size, go } = address;

  // The grid always reads the stored order (category position, the saved position, the name), the order merchants see (gridQuery).
  const grid = usePriceGrid(gridQuery({ type, q, group, page, size }));
  const groups = useGroupOptions(grants.can('groups:read'));
  const { categories } = useCategories();
  const editing = usePriceEdits();
  const setStatus = useSetGridStatus();
  const retailGroupId = groups.data?.find((entry) => entry.kind === RETAIL_GROUP_KIND)?.id;
  const { savePrices, saveOrder, savingPrices, savingOrder } = usePricingSave(editing, retailGroupId);

  const rows: PriceGridRow[] = grid.data?.data ?? [];
  const total = grid.data?.total;
  const { syncRows } = editing;
  useEffect(() => {
    if (grid.data) syncRows(grid.data.data);
  }, [grid.data, syncRows]);
  const settled = grid.isSuccess && !grid.isPlaceholderData;
  usePageClamp({ page, pageSize: size, total, settled, setPage: (next) => go({ page: next }) });

  const pricesLock = grants.needs('pricing:update');
  const updateLock = grants.needs('catalog:update');
  const order = useServiceDrag({
    rows,
    total,
    stale: grid.isPlaceholderData,
    q,
    group,
    page,
    lock: updateLock,
    typedPositions: editing.pendingOrders,
  });
  const columns = priceColumns({
    type,
    groupIds: rows[0]?.groupPrices.map((entry) => entry.groupId) ?? [],
    groupNames: new Map((groups.data ?? []).map((entry) => [entry.id, entry.name])),
    edits: editing.edits,
    notes: editing.notes,
    orders: editing.orders,
    orderNotes: editing.orderNotes,
    display,
    ordering,
    baseLock: grants.needsAll('catalog:update', 'pricing:update'),
    rankLock: groupsLock(pricesLock, grants.can('groups:read'), groups.data !== undefined, groups.isError),
    statusLock: updateLock,
    orderLock: updateLock,
    busyId: setStatus.isPending ? setStatus.variables?.id : undefined,
    onCell: editing.setCell,
    onOrder: editing.setOrder,
    onStatus: (row, active) =>
      setStatus.mutate({ id: row.id, name: row.name, status: active ? 'active' : 'disabled' }),
  });
  const filtered = q !== '' || group !== undefined;
  // Typed prices and positions are lost when the view is left: the guard asks first, and the browser asks before a reload.
  const unsaved = editing.pending > 0 || editing.pendingOrders > 0;
  const kindGroups = categories.filter((category) => category.type === type);

  return (
    <div className="view-frame">
      <div>
        <PricingSearch
          q={q}
          onSearch={(text) => go({ q: text })}
          group={group}
          groups={kindGroups}
          onGroup={(next) => go({ group: next })}
          display={display}
          onDisplay={setDisplay}
          ordering={ordering}
          onOrdering={setOrdering}
          lock={updateLock}
        />
        <div className="mt-4">
          {ordering && !order.dragging.on && order.dragging.hint && (
            <p className="mb-2 text-sm text-ink3">{order.dragging.reason}.</p>
          )}
          <SortableTable
            skin="list"
            caption="Price grid"
            columns={columns}
            rows={order.list}
            rowKey={(row) => row.id}
            drag={
              ordering
                ? {
                    offReason: order.dragging.on ? null : order.dragging.reason,
                    labelOf: (row) => row.name,
                    placeOf: (row) => order.list.findIndex((entry) => entry.id === row.id) + 1,
                    count: order.list.length,
                    onDrop: order.drop,
                  }
                : undefined
            }
            state={grid.isPending ? 'loading' : grid.isError && rows.length === 0 ? 'error' : 'ready'}
            error={grid.error}
            errorTitle="Could not load the prices"
            onRetry={() => void grid.refetch()}
            empty={
              <PricingEmpty
                type={type}
                filtered={filtered}
                canAdd={grants.can('catalog:create')}
                onClear={() => go({ q: '', group: undefined })}
              />
            }
          />
        </div>
        {editing.orderError && (
          <p role="alert" className="mt-3 text-sm text-crit-fg">
            {editing.orderError}
          </p>
        )}
        {bulkOpen && (
          <BulkPriceDialog
            selectedIds={[]}
            type={type}
            categoryId={group}
            onClose={() => setBulkOpen(false)}
            onApplied={() => undefined}
          />
        )}
        <UnsavedGuard active={unsaved} what="Pricing" />
      </div>
      <FooterPager
        page={page}
        pageSize={size}
        total={total ?? 0}
        onPage={(next) => go({ page: next })}
        onPageSize={(next) => go({ size: next })}
        actions={
          <>
            <Button
              variant="primary"
              loading={savingPrices}
              disabled={pricesLock.disabled || editing.pending === 0}
              title={pricesLock.title}
              onClick={() => void savePrices()}
            >
              Save prices
            </Button>
            <Button
              disabled={pricesLock.disabled || editing.pending > 0}
              title={
                pricesLock.title ??
                (editing.pending > 0 ? 'Save or discard the typed prices first' : undefined)
              }
              onClick={() => setBulkOpen(true)}
            >
              Bulk change…
            </Button>
            {ordering && (
              <Button
                loading={savingOrder}
                disabled={updateLock.disabled || editing.pendingOrders === 0}
                title={updateLock.title}
                onClick={() => void saveOrder()}
              >
                Save order
              </Button>
            )}
            {editing.pending > 0 && (
              <>
                <span className="text-sm text-ink2" role="status">
                  {editing.pending} {editing.pending === 1 ? 'price' : 'prices'} typed, not saved
                </span>
                <button type="button" className="link text-sm" onClick={editing.discard}>
                  Discard
                </button>
              </>
            )}
            {editing.summary && (
              <span className="text-sm text-crit-fg" role="status">
                {editing.summary}
              </span>
            )}
          </>
        }
      />
    </div>
  );
}
