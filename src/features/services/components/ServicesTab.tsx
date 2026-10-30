// ServicesTab: the "Services" tab: the toolbar, the table with its switches and row menus, the selection strip and the
// empty states. Ports `servicesTab` of 43-p-services.js. Filters, page and sort live in the address; the server filters, sorts
// and counts, and computes every price figure shown.
import { usePageClamp, type RowSelection, type SortState } from '@/components/ui';
import type { ServiceGrants } from '../hooks/useServiceGrants';
import { useServicesList } from '../hooks/useServicesList';
import { useSetExecutionMode, useSetServiceStatus } from '../hooks/useServiceMutations';
import { useServiceView } from '../hooks/useServiceView';
import { hasActiveFilters, PAGE_SIZE, toListFilters, type ServiceFilters } from '../lib/filters';
import { SelectionBar } from './SelectionBar';
import { ServiceRowMenu } from './ServiceRowMenu';
import type { ServiceDialogState } from './serviceDialogState';
import { ServicesEmpty } from './ServicesEmpty';
import { ServiceTable } from './ServiceTable';
import { ServicesToolbar } from './ServicesToolbar';

export interface ServicesTabProps {
  grants: ServiceGrants;
  /** The ticked services; the page owns it because the header's bulk action reads it too. */
  selection: RowSelection<number>;
  onDialog: (dialog: ServiceDialogState) => void;
}

/** Toolbar, selection strip and table; owns the switches' requests. */
export function ServicesTab({ grants, selection, onDialog }: ServicesTabProps) {
  const view = useServiceView();
  const list = useServicesList({
    filters: toListFilters(view.filters),
    page: view.page,
    pageSize: PAGE_SIZE,
    sort: view.sort,
    enabled: grants.ready,
  });
  // A shrinking list (a delete, a filter, an old link) must not leave the table on an empty page.
  usePageClamp({
    page: view.page,
    pageSize: PAGE_SIZE,
    total: list.total,
    settled: list.query.isSuccess && !list.query.isPlaceholderData,
    setPage: view.setPage,
  });
  const setStatus = useSetServiceStatus();
  const setMode = useSetExecutionMode();
  // Only the service whose switch is saving waits; the others stay usable.
  const busyId = setStatus.isPending
    ? setStatus.variables?.service.id
    : setMode.isPending
      ? setMode.variables?.service.id
      : undefined;
  const filtersOn = hasActiveFilters(view.filters);

  // Ticks are cleared when the list changes under them (a filter, the sort, the page), so no service is changed out of sight.
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
      <ServicesToolbar
        filters={view.filters}
        onChange={changeFilters}
        onClear={clearFilters}
        total={list.total}
      />
      <SelectionBar
        count={selection.selected.size}
        grants={grants}
        onBulk={() => onDialog({ kind: 'bulk' })}
        onClear={selection.clear}
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
          empty={<ServicesEmpty noServices={!filtersOn && list.total === 0} onClear={clearFilters} />}
          lock={grants.needs('catalog:update')}
          busyId={busyId}
          onToggleStatus={(service, on) => setStatus.mutate({ service, status: on ? 'active' : 'disabled' })}
          onToggleAuto={(service, on) => setMode.mutate({ service, mode: on ? 'auto' : 'manual' })}
          onEditPrice={(service) => onDialog({ kind: 'price', service })}
          menu={(service) => <ServiceRowMenu service={service} grants={grants} onDialog={onDialog} />}
        />
      </div>
    </>
  );
}
