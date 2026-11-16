// QuickAddGroups: step 1 of "Quick add…": the supplier's service groups with what each can add, a tick box per group, a box that
// ticks every group, a search and the choice of adding them on sale or switched off. Built in the demo's dialog and table style (the demo has no such
// screen); the list is `GET /admin/suppliers/:id/service-groups`.
import { useState } from 'react';
import type { UseQueryResult } from '@tanstack/react-query';
import {
  EmptyState,
  ErrorState,
  RadioGroup,
  SearchInput,
  SkeletonTable,
  type RadioOption,
  type RowSelection,
} from '@/components/ui';
import {
  allPickable,
  groupsText,
  lastRunLine,
  matchesSearch,
  MAX_QUICK_ADD_GROUPS,
  servicesText,
} from '../lib/quickAdd';
import type { QuickAddServiceStatus, ServiceGroups } from '../types';
import { QuickAddGroupTable } from './QuickAddGroupTable';
import { SelectAllBox } from './SelectAllBox';

const STATUS_OPTIONS: readonly RadioOption[] = [
  {
    value: 'active',
    label: 'On sale',
    description: 'Merchants can order them at once, at the suggested price.',
  },
  {
    value: 'disabled',
    label: 'Switched off',
    description: 'Check them on the Services page and switch them on yourself.',
  },
];

export interface QuickAddGroupsProps {
  groups: Pick<UseQueryResult<ServiceGroups>, 'data' | 'isError' | 'error' | 'refetch'>;
  selection: RowSelection<string>;
  /** What the picks add up to, worked out by the dialog (it needs the same figures for its buttons). */
  picked: { groups: number; services: number; tooMany: boolean };
  serviceStatus: QuickAddServiceStatus;
  onServiceStatus: (status: QuickAddServiceStatus) => void;
}

/** Step 1: search and tick groups. "Select all groups" ticks every group with something to add, whatever the search shows. */
export function QuickAddGroups({
  groups,
  selection,
  picked,
  serviceStatus,
  onServiceStatus,
}: QuickAddGroupsProps) {
  const [text, setText] = useState('');
  const data = groups.data;

  if (data === undefined) {
    return groups.isError ? (
      <ErrorState
        title="Could not load the supplier's groups"
        error={groups.error}
        onRetry={() => void groups.refetch()}
      />
    ) : (
      <SkeletonTable cols={4} rows={5} />
    );
  }

  const lastRun = lastRunLine(data.latestRun);
  const lastRunNote = lastRun && <p className="text-xs text-ink3">{lastRun}</p>;
  if (data.groups.length === 0) {
    return (
      <>
        {lastRunNote}
        <EmptyState icon="inbox" title="No services yet">
          Sync the supplier to copy its service list.
        </EmptyState>
      </>
    );
  }
  if (data.totals.addable === 0) {
    return (
      <>
        {lastRunNote}
        <EmptyState icon="check" title="Nothing to add">
          Everything this supplier lists is already in the console, or cannot be added.
        </EmptyState>
      </>
    );
  }

  const shown = data.groups.filter((group) => matchesSearch(group, text));
  const every = allPickable(data.groups);
  const everyState = picked.groups === 0 ? 'none' : picked.groups === every.groups ? 'all' : 'some';

  return (
    <div className="space-y-3">
      <SearchInput
        value={text}
        onChange={setText}
        placeholder="Search groups"
        // Enter must not submit the dialog's form (that would press Review).
        onKeyDown={(event) => {
          if (event.key === 'Enter') event.preventDefault();
        }}
      />
      <SelectAllBox
        label={`Select all groups (${groupsText(every.groups)}, ${servicesText(every.services)} to add)`}
        state={everyState}
        disabled={every.groups === 0}
        onChange={(on) => selection.setMany(every.keys, on)}
      />
      <QuickAddGroupTable rows={shown} selection={selection} />
      <p className="text-xs text-ink3" aria-live="polite">
        {groupsText(picked.groups)} picked, {servicesText(picked.services)} to add
      </p>
      {picked.tooMany && (
        <p className="text-xs text-crit-fg" role="alert">
          Pick at most {MAX_QUICK_ADD_GROUPS} groups, or select all.
        </p>
      )}
      <RadioGroup
        legend="Add them as"
        name="quick-add-status"
        options={STATUS_OPTIONS}
        value={serviceStatus}
        listClassName="grid gap-2 sm:grid-cols-2"
        onChange={(event) => onServiceStatus(event.target.value === 'disabled' ? 'disabled' : 'active')}
      />
      {lastRunNote}
    </div>
  );
}
