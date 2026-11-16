// ImportPicker: step 1 of "Import services…": the supplier's own service list (`GET /admin/suppliers/:id/services`) with a search, a
// group filter, a "not imported yet" filter, a tick box per service and one that ticks every service not imported yet on all pages.
// The ticks stay while the page, the search or a filter changes. Built in the demo's dialog and table style (no import screen there).
import {
  Badge,
  CheckboxField,
  DataTable,
  EmptyState,
  SearchInput,
  SelectField,
  TypeTag,
  type DataTableColumn,
  type RowSelection,
} from '@/components/ui';
import { money, num } from '@/lib/format';
import type { ImportFilter } from '../hooks/useImportFilter';
import { useServiceGroups } from '../hooks/useQuickAdd';
import type { SelectAllNotImported } from '../hooks/useSelectAllNotImported';
import { useSupplierCatalogue } from '../hooks/useSupplierCatalogue';
import { BATCH_SIZE } from '../lib/batches';
import { groupOption, groupValue } from '../lib/quickAdd';
import type { SupplierService } from '../types';
import { SelectAllNotImportedBox } from './SelectAllNotImportedBox';

/** Services per page of the picker. */
export const PICKER_PAGE_SIZE = 25;

const COLUMNS: DataTableColumn<SupplierService>[] = [
  {
    key: 'name',
    label: 'Service',
    render: (item) => (
      <>
        <span className="font-medium">{item.name}</span>
        <p className="text-2xs text-ink3">{item.remoteGroup}</p>
      </>
    ),
  },
  { key: 'type', label: 'Type', hide: 'sm', render: (item) => <TypeTag>{item.type.toUpperCase()}</TypeTag> },
  {
    key: 'time',
    label: 'Time',
    hide: 'md',
    render: (item) => <span className="text-ink2">{item.time}</span>,
  },
  { key: 'cost', label: 'Cost', num: true, render: (item) => money(item.credit) },
  {
    key: 'state',
    label: 'In console',
    render: (item) =>
      item.imported ? (
        <Badge tone="neutral" icon="check">
          Imported
        </Badge>
      ) : (
        <span className="text-ink3">–</span>
      ),
  },
];

export interface ImportPickerProps {
  supplierId: number;
  selection: RowSelection<number>;
  /** The search, group, "only not imported" and page: the dialog keeps them so the select-all box reads the same search. */
  filter: ImportFilter;
  /** The "Select all not imported" box, worked out by the dialog (its Preview button waits while the box reads). */
  all: SelectAllNotImported;
  /**
   * A preview is running (several calls for more than 500 picks): the picker cannot be used, so the picks stay the ones being
   * previewed.
   */
  locked?: boolean;
}

/** Step 1: search and tick services. `selection` belongs to the dialog, so ticks stay across pages and filters. */
export function ImportPicker({ supplierId, selection, filter, all, locked = false }: ImportPickerProps) {
  const { text, q, page, onlyNew, group, setPage } = filter;
  const list = useSupplierCatalogue({ supplierId, page, pageSize: PICKER_PAGE_SIZE, q, onlyNew, group });
  // A group without a name cannot be filtered on (the server skips an empty value), so it is not offered.
  const named = (useServiceGroups(supplierId).data?.groups ?? []).filter((item) => item.remoteGroup !== '');

  return (
    <div className="space-y-3" inert={locked} aria-busy={locked || undefined}>
      <div className="flex flex-wrap items-center gap-3">
        <SearchInput
          value={text}
          onChange={filter.setText}
          placeholder="Search the supplier's services"
          // Enter must not submit the dialog's form (that would press Preview).
          onKeyDown={(event) => {
            if (event.key === 'Enter') event.preventDefault();
          }}
        />
        <SelectField
          aria-label="Group"
          value={group ? groupValue(group) : ''}
          options={[
            { value: '', label: 'All groups' },
            ...named.map((item) => ({ value: groupValue(item), label: groupOption(item) })),
          ]}
          onChange={(event) => {
            // Only the group's identity goes into the query key, not its counts (they change after every import).
            const found = named.find((item) => groupValue(item) === event.target.value);
            filter.setGroup(found && { type: found.type, remoteGroup: found.remoteGroup });
          }}
        />
        <CheckboxField
          label="Only services not imported yet"
          checked={onlyNew}
          onChange={(event) => filter.setOnlyNew(event.target.checked)}
        />
        <SelectAllNotImportedBox all={all} />
        <span className="ms-auto text-xs text-ink3" aria-live="polite">
          {num(selection.selected.size)} picked
        </span>
      </div>
      {selection.selected.size > BATCH_SIZE && (
        <p className="text-xs text-ink3">
          More than {BATCH_SIZE} picked: they are previewed and imported {BATCH_SIZE} at a time.
        </p>
      )}
      <div className="max-h-[360px] overflow-auto rounded-md border border-line">
        <DataTable
          caption="Supplier services"
          columns={COLUMNS}
          rows={list.data?.data ?? []}
          rowKey={(item) => item.id}
          selection={selection}
          state={list.isLoading ? 'loading' : list.isError ? 'error' : 'ready'}
          error={list.error}
          errorTitle="Could not load the supplier's services"
          onRetry={() => void list.refetch()}
          pagination={{ page, pageSize: PICKER_PAGE_SIZE, total: list.data?.total ?? 0 }}
          onPageChange={setPage}
          skeletonRows={5}
          empty={
            <EmptyState icon="inbox" title="No services found">
              {q || onlyNew || group
                ? 'No service matches. Change the search or the filter.'
                : 'Sync the supplier to copy its service list.'}
            </EmptyState>
          }
        />
      </div>
    </div>
  );
}
