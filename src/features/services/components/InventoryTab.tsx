// InventoryTab: the Inventory view's code stock (the "Code inventory" tab the map adds to the demo's page): the stock of digital codes (masked),
// filters by service and status in a Quick Search box, "With selected" to void the unsold ones, Import codes… in the pinned footer, which also
// holds the pager. Filters and page live in the address; the page size is the view's own. The server masks the codes, finds duplicates and
// decides which codes can be voided. The import and void dialogs stay dialogs in this version.
import { useState } from 'react';
import {
  Button,
  EmptyState,
  FooterPager,
  Icon,
  usePageClamp,
  useRowSelection,
  WithSelected,
} from '@/components/ui';
import { useServiceChoices } from '../hooks/useChoices';
import { useInventoryList } from '../hooks/useInventory';
import { useInventoryView } from '../hooks/useSelectionView';
import { useServiceGrants } from '../hooks/useServiceGrants';
import { INVENTORY_PAGE_SIZE } from '../lib/filters';
import type { InventoryFilters, ServiceType } from '../types';
import { ImportCodesDialog } from './ImportCodesDialog';
import { InventoryTable } from './InventoryTable';
import { InventoryToolbar } from './InventoryToolbar';
import { VoidCodesDialog } from './VoidCodesDialog';

export interface InventoryTabProps {
  /** Only the services of this kind are offered in the service filter (the Product / Services page's strip); the code list has no kind. */
  type?: ServiceType;
}

/** The code stock with its filters, tick boxes, pager and the import and void dialogs. */
export function InventoryTab({ type }: InventoryTabProps) {
  const grants = useServiceGrants();
  const view = useInventoryView();
  const canServices = grants.can('catalog:read');
  const services = useServiceChoices(grants.ready && canServices, type);
  const selection = useRowSelection<number>();
  const [dialog, setDialog] = useState<'import' | 'void' | null>(null);
  const [size, setSize] = useState(INVENTORY_PAGE_SIZE);

  const filters: InventoryFilters = {
    ...(view.serviceId !== null ? { serviceId: view.serviceId } : {}),
    ...(view.status ? { status: view.status } : {}),
  };
  const list = useInventoryList({ filters, page: view.page, pageSize: size, enabled: grants.ready });
  usePageClamp({
    page: view.page,
    pageSize: size,
    total: list.total,
    settled: list.query.isSuccess && !list.query.isPlaceholderData,
    setPage: view.setPage,
  });
  // Ticks are cleared when the list changes under them, so no code is voided out of sight.
  const changed = (action: () => void) => () => {
    selection.clear();
    action();
  };
  // Only unsold codes can be voided; the server skips the others and says so.
  const unsold = list.codes.filter((code) => selection.has(code.id) && code.status === 'available');
  const filtersOn = view.serviceId !== null || view.status !== '';
  const importLock = grants.needsAll('inventory:write', 'catalog:read');
  const voidLock = grants.needs('inventory:write');

  return (
    <div className="view-frame">
      <div>
        <p className="hint mb-3">
          Digital codes for services that deliver a code. They are shown masked: only the last four
          characters.
        </p>
        <InventoryToolbar
          serviceId={view.serviceId}
          status={view.status}
          services={canServices ? (services.data ?? []) : undefined}
          onService={(id) => {
            selection.clear();
            view.setServiceId(id);
          }}
          onStatus={(status) => {
            selection.clear();
            view.setStatus(status);
          }}
          onClear={changed(view.clear)}
          onRefresh={() => void list.query.refetch()}
          busy={list.query.isFetching}
        />
        <InventoryTable
          rows={list.codes}
          state={list.query.isLoading ? 'loading' : list.query.isError ? 'error' : 'ready'}
          error={list.query.error}
          onRetry={() => void list.query.refetch()}
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
        <WithSelected
          count={selection.selected.size}
          onCheckAll={() =>
            selection.setMany(
              list.codes.map((code) => code.id),
              true,
            )
          }
          onUncheckAll={selection.clear}
        >
          <Button
            size="sm"
            variant="danger"
            disabled={voidLock.disabled || unsold.length === 0}
            title={voidLock.title ?? (unsold.length === 0 ? 'None of the ticked codes is unsold' : undefined)}
            onClick={() => setDialog('void')}
          >
            <Icon name="ban" className="ic-sm" />
            Void unsold codes…
          </Button>
        </WithSelected>
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
      </div>
      <FooterPager
        page={view.page}
        pageSize={size}
        total={list.total ?? list.codes.length}
        onPage={(page) => {
          selection.clear();
          view.setPage(page);
        }}
        onPageSize={(next) => {
          selection.clear();
          setSize(next);
          view.setPage(1);
        }}
        actions={
          <Button
            variant="primary"
            disabled={importLock.disabled}
            title={importLock.title}
            onClick={() => setDialog('import')}
          >
            <Icon name="upload" className="ic-sm" />
            Import codes…
          </Button>
        }
      />
    </div>
  );
}
