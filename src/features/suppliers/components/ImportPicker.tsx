// ImportPicker: step 1 of "Import services…": the supplier's own service list with a name search, a group filter, a "not imported
// yet" filter and a tick box per service. The ticks stay while the page, the search or a filter changes. Built in the demo's dialog
// and table style (the demo has no import screen); the list is `GET /admin/suppliers/:id/services`.
import { useState } from 'react';
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
import { money } from '@/lib/format';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import { useServiceGroups } from '../hooks/useQuickAdd';
import { useSupplierCatalogue } from '../hooks/useSupplierCatalogue';
import { groupOption, groupValue } from '../lib/quickAdd';
import type { QuickAddGroupRef, SupplierService } from '../types';

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
}

/** Step 1: search and tick services. `selection` belongs to the dialog, so ticks stay across pages and filters. */
export function ImportPicker({ supplierId, selection }: ImportPickerProps) {
  const [text, setText] = useState('');
  const [page, setPage] = useState(1);
  const [onlyNew, setOnlyNew] = useState(false);
  const [group, setGroup] = useState<QuickAddGroupRef | undefined>();
  const q = useDebouncedValue(text.trim());
  const list = useSupplierCatalogue({ supplierId, page, pageSize: PICKER_PAGE_SIZE, q, onlyNew, group });
  const page1 = () => setPage(1);
  // A group without a name cannot be filtered on (the server skips an empty value), so it is not offered.
  const named = (useServiceGroups(supplierId).data?.groups ?? []).filter((item) => item.remoteGroup !== '');

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <SearchInput
          value={text}
          onChange={(value) => {
            setText(value);
            page1();
          }}
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
            setGroup(found && { type: found.type, remoteGroup: found.remoteGroup });
            page1();
          }}
        />
        <CheckboxField
          label="Only services not imported yet"
          checked={onlyNew}
          onChange={(event) => {
            setOnlyNew(event.target.checked);
            page1();
          }}
        />
        <span className="ms-auto text-xs text-ink3" aria-live="polite">
          {selection.selected.size} picked
        </span>
      </div>
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
