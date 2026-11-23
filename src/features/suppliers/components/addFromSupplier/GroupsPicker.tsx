// GroupsPicker: the whole-groups picker of the Add-from-supplier form, in place: a Quick Search box, the table of the supplier's groups of the
// page's kind with a tick box each, "Check All / Uncheck All", what is picked and what adding it does in the server's own terms.
import { useState } from 'react';
import { Link } from 'react-router';
import {
  EmptyState,
  ErrorState,
  LegendBox,
  SearchInput,
  SectionHeading,
  SkeletonTable,
} from '@/components/ui';
import { storefrontPricingPath } from '@/features/storefront';
import { TYPE_LABEL } from '@/lib/serviceTypes';
import {
  allPickable,
  groupsText,
  lastRunLine,
  matchesSearch,
  MAX_QUICK_ADD_GROUPS,
  servicesText,
} from '../../lib/quickAdd';
import { ruleLine } from '../../lib/quickAddFlow';
import { CheckStrip } from './CheckStrip';
import { GroupsTable } from './GroupsTable';
import type { AddState } from './hooks/useAddFromSupplier';

/** The picker. Nothing here works out a count: every figure is the server's (`addable`, `imported`, `unavailable`, `unsupported`). */
export function GroupsPicker({ add }: { add: AddState }) {
  const { groupsQuery, kindList, groups, type, shop } = add;
  const [text, setText] = useState('');
  const data = groupsQuery.data;

  if (data === undefined) {
    return groupsQuery.isError ? (
      <ErrorState
        title="Could not load the supplier's groups"
        error={groupsQuery.error}
        onRetry={() => void groupsQuery.refetch()}
      />
    ) : (
      <SkeletonTable cols={4} rows={5} />
    );
  }

  const kind = TYPE_LABEL[type];
  const lastRun = lastRunLine(data.latestRun);
  const note = lastRun && <p className="mt-2 text-xs text-ink3">{lastRun}</p>;
  if (kindList.length === 0) {
    return (
      <>
        <EmptyState icon="inbox" title={`No ${kind} services`}>
          This supplier lists no {kind} services yet. Sync the supplier to copy its service list, or look at
          another kind.
        </EmptyState>
        {note}
      </>
    );
  }
  const every = allPickable(kindList);
  if (every.groups === 0) {
    return (
      <>
        <EmptyState icon="check" title="Nothing to add">
          Every {kind} service this supplier lists is already in the console, or cannot be added.
        </EmptyState>
        {note}
      </>
    );
  }

  const { picked } = groups;
  const shown = kindList.filter((group) => matchesSearch(group, text));
  return (
    <section aria-label="Groups to add" className="space-y-3 pb-4">
      <SectionHeading>Groups to add</SectionHeading>
      <LegendBox legend="Quick Search">
        <SearchInput
          value={text}
          onChange={setText}
          placeholder="Search groups"
          // Enter must not submit the form (that would press Add).
          onKeyDown={(event) => {
            if (event.key === 'Enter') event.preventDefault();
          }}
        />
      </LegendBox>
      <div>
        <GroupsTable rows={shown} selection={groups.selection} />
        <CheckStrip
          onCheckAll={() => groups.selection.setMany(every.keys, true)}
          onUncheckAll={() => groups.selection.clear()}
          summary={`${groupsText(picked.groups)} picked, ${servicesText(picked.services)} to add`}
        />
      </div>
      {picked.tooMany && (
        <p className="text-xs text-crit-fg" role="alert">
          Pick at most {MAX_QUICK_ADD_GROUPS} groups, or all of them.
        </p>
      )}
      <ul className="list-disc space-y-1 ps-5 text-sm text-ink2" aria-label="What adding them does">
        <li>Price for merchants: the supplier&rsquo;s cost plus the default minimum profit.</li>
        <li>
          {ruleLine(shop.rule)}{' '}
          <Link className="link" to={storefrontPricingPath()}>
            Open the shop price rules
          </Link>
        </li>
        <li>Order fields and quantities are copied from the supplier.</li>
        <li>Services already in the console are not changed.</li>
      </ul>
      {note}
    </section>
  );
}
