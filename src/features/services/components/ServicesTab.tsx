// ServicesTab: the Catalog table view: the chips with their counts, the toolbar, the selection bar, the table with its switches and row
// menus, and the empty states. Ports `servicesTab` of 43-p-services.js. The chip, filters, page, sort and open service live in the
// address; the server filters, sorts and counts, computes every price figure and decides what needs attention.
import { useEffect } from 'react';
import { usePageClamp, type RowSelection, type SortState } from '@/components/ui';
import { useCategories, useSupplierChoices } from '../hooks/useChoices';
import { useChipCounts } from '../hooks/useServiceCounts';
import type { ServiceGrants } from '../hooks/useServiceGrants';
import { useServicesList } from '../hooks/useServicesList';
import { useSetServiceStatus } from '../hooks/useServiceMutations';
import { useServiceView, type PanelSection } from '../hooks/useServiceView';
import { rowsCarry } from '../lib/catalogRows';
import {
  hasActiveFilters,
  PAGE_SIZE,
  toListFilters,
  usableFilters,
  type ServiceFilters,
} from '../lib/filters';
import type { Service } from '../types';
import { ServiceRowMenu } from './ServiceRowMenu';
import type { ServiceDialogState } from './serviceDialogState';
import { ServicesEmpty } from './ServicesEmpty';
import { ServiceTable } from './ServiceTable';
import { ServicesToolbar } from './ServicesToolbar';
import { CatalogBulkBar } from './table/CatalogBulkBar';
import { CatalogChips } from './table/CatalogChips';
import { OnShopSwitch } from './table/OnShopSwitch';

export interface ServicesTabProps {
  grants: ServiceGrants;
  /** The ticked services; the page owns it because the header's bulk action reads it too. */
  selection: RowSelection<number>;
  onDialog: (dialog: ServiceDialogState) => void;
  /** The service whose side panel is open: its row is marked and the table keeps a compact set of columns. */
  openId?: number | null;
  /** Asked for when a name or a badge opens a service. The page asks about unsaved changes first; without it the address is set. */
  onOpenService?: (service: Service, section?: PanelSection) => void;
  /** Told the rows of the loaded page, so the side panel can take its service from them. */
  onRows?: (rows: readonly Service[]) => void;
}

// Stands for "no page loaded yet": one array, so the parent's state does not change on every render.
const NO_ROWS: readonly Service[] = [];

/** Chips, toolbar, selection bar and table; owns the Enabled switches' requests (the shop switch runs under the view's ShopSwitchProvider). */
export function ServicesTab({
  grants,
  selection,
  onDialog,
  openId,
  onOpenService,
  onRows,
}: ServicesTabProps) {
  const view = useServiceView();
  const catalog = grants.ready && grants.can('catalog:read');
  const storefront = grants.ready && grants.can('storefront:read');
  // A filter the role may not use (a shop filter without storefront:read) is dropped, not sent to be refused.
  const filters = usableFilters(view.filters, { storefront });
  const list = useServicesList({
    filters: toListFilters(filters),
    page: view.page,
    pageSize: PAGE_SIZE,
    sort: view.sort,
    enabled: catalog,
  });
  // A shrinking list (a delete, a filter, an old link) must not leave the table on an empty page.
  usePageClamp({
    page: view.page,
    pageSize: PAGE_SIZE,
    total: list.total,
    settled: list.query.isSuccess && !list.query.isPlaceholderData,
    setPage: view.setPage,
  });
  const counts = useChipCounts({ catalog, storefront });
  const { categories } = useCategories(catalog);
  const suppliers = useSupplierChoices(grants.ready && grants.can('suppliers:read'));
  const setStatus = useSetServiceStatus();
  const filtersOn = hasActiveFilters(filters);
  const ticked = list.services.filter((service) => selection.has(service.id));
  const pageRows = list.query.data?.data ?? NO_ROWS;
  useEffect(() => {
    onRows?.(pageRows);
  }, [onRows, pageRows]);

  // Ticks are cleared when the list changes under them (a chip, a filter, the sort, the page), so no service is changed out of sight.
  const changeFilters = (patch: Partial<ServiceFilters>) => {
    selection.clear();
    view.setFilters(patch);
  };
  const clearFilters = () => {
    selection.clear();
    view.clearFilters();
  };
  const changeSort = (next: SortState) => {
    selection.clear();
    view.setSort(next);
  };
  const changePage = (next: number) => {
    selection.clear();
    view.setPage(next);
  };

  return (
    <>
      <CatalogChips
        value={filters.chip}
        counts={counts}
        storefront={storefront}
        onChange={(chip) => changeFilters({ chip })}
      />
      <ServicesToolbar
        filters={filters}
        onChange={changeFilters}
        onClear={clearFilters}
        total={list.total}
        categories={categories}
        suppliers={suppliers.data ?? []}
        supplierLock={grants.needs('suppliers:read')}
      />
      <CatalogBulkBar
        services={ticked}
        selection={selection}
        grants={grants}
        shop={rowsCarry(list.services, 'listingId')}
        categories={categories}
        onBulkPrice={() => onDialog({ kind: 'bulk' })}
      />
      <div className="border-t border-line">
        <ServiceTable
          rows={list.services}
          state={list.query.isLoading ? 'loading' : list.query.isError ? 'error' : 'ready'}
          error={list.query.error}
          onRetry={() => void list.query.refetch()}
          sort={view.sort}
          onSortChange={changeSort}
          pagination={{ page: view.page, pageSize: PAGE_SIZE, total: list.total ?? list.services.length }}
          onPageChange={changePage}
          selection={selection}
          empty={
            <ServicesEmpty
              noServices={!filtersOn && !filters.chip && list.total === 0}
              filtersOn={filtersOn}
              onClear={clearFilters}
              onAll={() => changeFilters({ chip: '' })}
            />
          }
          lock={grants.needs('catalog:update')}
          priceLock={grants.needsAll('catalog:update', 'pricing:update')}
          busyId={setStatus.isPending ? setStatus.variables?.service.id : undefined}
          openId={openId ?? undefined}
          compact={openId != null}
          onOpen={(service, section) =>
            onOpenService ? onOpenService(service, section) : view.openService(service.id, section)
          }
          onToggleStatus={(service, on) => setStatus.mutate({ service, status: on ? 'active' : 'disabled' })}
          onEditPrice={(service) => onDialog({ kind: 'price', service })}
          shopCell={(service) => <OnShopSwitch service={service} grants={grants} />}
          menu={(service) => <ServiceRowMenu service={service} grants={grants} onDialog={onDialog} />}
        />
      </div>
    </>
  );
}
