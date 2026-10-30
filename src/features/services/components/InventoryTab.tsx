// InventoryTab: the "Code inventory" tab the map adds to the demo's page: the stock of digital codes (masked), filters by service and
// status, Import codes… per service, and Void selected unsold codes. Filters and page live in the address. The server masks the
// codes, finds duplicates and decides which codes can be voided.
import { useState } from 'react';
import { Button, EmptyState, Icon, usePageClamp, useRowSelection } from '@/components/ui';
import { useServiceChoices } from '../hooks/useChoices';
import { useInventoryList } from '../hooks/useInventory';
import { useInventoryView } from '../hooks/useSelectionView';
import { useServiceGrants } from '../hooks/useServiceGrants';
import { INVENTORY_PAGE_SIZE } from '../lib/filters';
import type { InventoryFilters } from '../types';
import { ImportCodesDialog } from './ImportCodesDialog';
import { InventoryBar } from './InventoryBar';
import { InventoryTable } from './InventoryTable';
import { InventoryToolbar } from './InventoryToolbar';
import { VoidCodesDialog } from './VoidCodesDialog';

/** The code stock with its filters, tick boxes and the import and void dialogs. */
export function InventoryTab() {
  const grants = useServiceGrants();
  const view = useInventoryView();
  const canServices = grants.can('catalog:read');
  const services = useServiceChoices(grants.ready && canServices);
  const selection = useRowSelection<number>();
  const [dialog, setDialog] = useState<'import' | 'void' | null>(null);

  const filters: InventoryFilters = {
    ...(view.serviceId !== null ? { serviceId: view.serviceId } : {}),
    ...(view.status ? { status: view.status } : {}),
  };
  const list = useInventoryList({
    filters,
    page: view.page,
    pageSize: INVENTORY_PAGE_SIZE,
    enabled: grants.ready,
  });
  usePageClamp({
    page: view.page,
    pageSize: INVENTORY_PAGE_SIZE,
    total: list.total,
    settled: list.query.isSuccess && !list.query.isPlaceholderData,
    setPage: view.setPage,
  });
  // Ticks are cleared when the list changes under them, so no code is voided out of sight.
  const changed = (action: () => void) => () => {
    selection.clear();
    action();
  };
  const unsold = list.codes.filter((code) => selection.has(code.id) && code.status === 'available');
  const filtersOn = view.serviceId !== null || view.status !== '';
  const importLock = grants.needsAll('inventory:write', 'catalog:read');

  return (
    <>
      <div className="flex flex-wrap items-center gap-2 p-3">
        <p className="min-w-[13rem] flex-1 text-sm text-ink2">
          Digital codes for services that deliver a code. They are shown masked: only the last four
          characters.
        </p>
        <Button
          variant="primary"
          size="sm"
          disabled={importLock.disabled}
          title={importLock.title}
          onClick={() => setDialog('import')}
        >
          <Icon name="upload" className="ic-sm" />
          Import codes…
        </Button>
      </div>
      <div className="border-t border-line">
        <InventoryToolbar
          serviceId={view.serviceId}
          status={view.status}
          services={canServices ? (services.data ?? []) : undefined}
          total={list.total}
          onService={(id) => {
            selection.clear();
            view.setServiceId(id);
          }}
          onStatus={(status) => {
            selection.clear();
            view.setStatus(status);
          }}
          onClear={changed(view.clear)}
        />
        <InventoryBar
          selected={selection.selected.size}
          unsold={unsold.length}
          grants={grants}
          onVoid={() => setDialog('void')}
          onClear={selection.clear}
        />
        <div className="border-t border-line">
          <InventoryTable
            rows={list.codes}
            state={list.query.isLoading ? 'loading' : list.query.isError ? 'error' : 'ready'}
            error={list.query.error}
            onRetry={() => void list.query.refetch()}
            pagination={{
              page: view.page,
              pageSize: INVENTORY_PAGE_SIZE,
              total: list.total ?? list.codes.length,
            }}
            onPageChange={(page) => {
              selection.clear();
              view.setPage(page);
            }}
            selection={selection}
            empty={
              filtersOn ? (
                <EmptyState
                  icon="filter"
                  title="No codes match"
                  cta={<Button onClick={changed(view.clear)}>Clear filters</Button>}
                >
                  Try another service or status.
                </EmptyState>
              ) : (
                <EmptyState icon="inbox" title="No codes in stock">
                  Import codes for a service that delivers a code, and they appear here.
                </EmptyState>
              )
            }
          />
        </div>
      </div>
      {dialog === 'import' && (
        <ImportCodesDialog serviceId={view.serviceId} onClose={() => setDialog(null)} />
      )}
      {dialog === 'void' && (
        <VoidCodesDialog
          ids={unsold.map((code) => code.id)}
          onClose={() => setDialog(null)}
          onDone={selection.clear}
        />
      )}
    </>
  );
}
