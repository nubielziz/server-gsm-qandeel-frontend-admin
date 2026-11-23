// ServicesPicker: the single-services picker of the Add-from-supplier form, in place: a Quick Search box (group, search, only not imported yet),
// the supplier's services of the page's kind with a tick box each, "Check All / Uncheck All" with Preview directly under the table, the pager
// after it, and the server's preview of what adding the picks does. The ticks stay while the page, the search or the group changes.
import {
  Button,
  CheckboxField,
  EmptyState,
  ErrorState,
  FooterPager,
  LegendBox,
  QuickSearchText,
  SectionHeading,
  SelectField,
  SkeletonTable,
  WithSelected,
} from '@/components/ui';
import { TYPE_LABEL } from '@/lib/serviceTypes';
import { BATCH_SIZE } from '../../lib/batches';
import { runWords } from '../../lib/importPlan';
import { groupName, groupValue, servicesText } from '../../lib/quickAdd';
import { ImportPreviewTable } from './ImportPreviewTable';
import type { AddState } from './hooks/useAddFromSupplier';
import { PICKER_SIZES } from './hooks/useServicesFilter';
import { ServicesTable } from './ServicesTable';
import { matchesKind } from './lib/addRules';

/** The picker and, under it, the preview of what the picks do. */
export function ServicesPicker({ add }: { add: AddState }) {
  const { singles, kindList, type } = add;
  const { filter, selection, list, all } = singles;
  const kind = TYPE_LABEL[type];

  // The groups come first: they tell which services are of the page's kind.
  if (add.groupsQuery.data === undefined) {
    return add.groupsQuery.isError ? (
      <ErrorState
        title="Could not load the supplier's groups"
        error={add.groupsQuery.error}
        onRetry={() => void add.groupsQuery.refetch()}
      />
    ) : (
      <SkeletonTable cols={4} rows={5} />
    );
  }
  if (kindList.length === 0) {
    return (
      <EmptyState icon="inbox" title={`No ${kind} services`}>
        This supplier lists no {kind} services yet. Sync the supplier to copy its service list, or look at
        another kind.
      </EmptyState>
    );
  }

  // A group without a name cannot be filtered on (the server skips an empty value), so it is not offered.
  const named = kindList.filter((group) => group.remoteGroup !== '');
  // The server narrows the list to the kind when the supplier spells it one way; otherwise the rows of the page are narrowed here.
  const narrowed = list.data?.data ?? [];
  const rows = narrowed.filter((row) => matchesKind(row.type, type));
  const picked = selection.selected.size;

  return (
    <section aria-label="Services to add" className="space-y-3 pb-4">
      <SectionHeading>Services to add</SectionHeading>
      <LegendBox legend="Quick Search">
        <SelectField
          aria-label="Group"
          selectWrapClassName="w-full max-w-md"
          value={filter.group ? groupValue(filter.group) : ''}
          options={[
            { value: '', label: 'Select Group' },
            ...named.map((group) => ({ value: groupValue(group), label: groupName(group) })),
          ]}
          onChange={(event) => {
            // Only the group's identity goes into the query key, not its counts (they change after every import).
            const found = named.find((group) => groupValue(group) === event.target.value);
            filter.setGroup(found && { type: found.type, remoteGroup: found.remoteGroup });
          }}
        />
        <QuickSearchText
          value={filter.draft}
          onChange={filter.setDraft}
          onSearch={filter.search}
          placeholder="Search service from any group"
        />
        <CheckboxField
          label="Only services not imported yet"
          checked={filter.onlyNew}
          onChange={(event) => filter.setOnlyNew(event.target.checked)}
        />
      </LegendBox>
      <div>
        <ServicesTable
          list={list}
          rows={rows}
          selection={selection}
          filtered={filter.q !== '' || filter.onlyNew || filter.group !== undefined}
        />
        <WithSelected
          count={picked}
          onCheckAll={() => void all.toggle(true)}
          onUncheckAll={() => selection.clear()}
        >
          <Button
            size="sm"
            loading={singles.previewing}
            disabled={all.busy}
            onClick={() => void singles.preview()}
          >
            {runWords('Preview', 'Preview', singles.previewRun)}
          </Button>
        </WithSelected>
        <p className="px-3.5 text-xs text-ink3" aria-live="polite">
          {all.busy
            ? 'Selecting…'
            : all.total === undefined
              ? ''
              : `Check All ticks the ${servicesText(all.total)} not in the console yet for this search and group, on every page.`}
        </p>
        <FooterPager
          inline
          page={filter.page}
          pageSize={filter.pageSize}
          total={list.data?.total ?? 0}
          onPage={filter.setPage}
          onPageSize={filter.setPageSize}
          sizes={PICKER_SIZES}
        />
      </div>
      {picked > BATCH_SIZE && (
        <p className="text-xs text-ink3">
          More than {BATCH_SIZE} picked: they are previewed and added {BATCH_SIZE} at a time.
        </p>
      )}
      {singles.items ? (
        <>
          <SectionHeading as="h3">What adding them does</SectionHeading>
          <ImportPreviewTable items={singles.items} />
        </>
      ) : (
        picked > 0 && (
          <p className="text-xs text-ink3">
            Press Preview to see what adding the picked services does before you add them.
          </p>
        )
      )}
    </section>
  );
}
