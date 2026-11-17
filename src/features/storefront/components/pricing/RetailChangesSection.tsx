// RetailChangesSection: the "Price changes" block: what the server did when a cost moved (a price followed it, a rule or the floor
// moved, a price stopped following) and the proposals that wait for a person, newest first. Waiting is shown by default. Ticked
// proposals are approved or kept together; the ids the server skips are listed in a note. Needs pricing:read; resolving needs
// pricing:update. The page, sort and filter live in the address.
import { useState } from 'react';
import { EmptyState, Button, SegmentedControl, useRowSelection, usePageClamp } from '@/components/ui';
import { useListView } from '../../hooks/useListView';
import { useResolveRetailChanges, useRetailChanges } from '../../hooks/useRetailPricing';
import type { StorefrontGrants } from '../../hooks/useStorefrontGrants';
import { skippedText, type ChangesShow } from '../../lib/retailPricing';
import { CHANGES_VIEW, PAGE_SIZE } from '../../lib/views';
import type { ResolveRetailPriceChangesBody } from '../../types';
import { PricingSection } from './PricingSection';
import { RetailChangesBar } from './RetailChangesBar';
import { RetailChangesTable } from './RetailChangesTable';

const SHOW_ITEMS = [
  { value: 'waiting', label: 'Waiting' },
  { value: 'all', label: 'All' },
] as const;

/** The filter, the bar, the table and the note of skipped ids. */
export function RetailChangesSection({ grants }: { grants: StorefrontGrants }) {
  const { view, setFilter, setPage, setSort } = useListView(CHANGES_VIEW);
  const show: ChangesShow = view.filters.show === 'all' ? 'all' : 'waiting';
  const list = useRetailChanges({
    show,
    page: view.page,
    sort: view.sort,
    enabled: grants.ready && grants.can('pricing:read'),
  });
  usePageClamp({
    page: view.page,
    pageSize: PAGE_SIZE,
    total: list.total,
    settled: list.query.isSuccess && !list.query.isPlaceholderData,
    setPage,
  });
  const selection = useRowSelection<number>();
  const resolve = useResolveRetailChanges();
  const [skipped, setSkipped] = useState<string[]>([]);

  // The ticks belong to the rows on screen: a new page, sort or filter starts clean.
  const fresh =
    <A extends unknown[]>(change: (...args: A) => void) =>
    (...args: A) => {
      selection.clear();
      setSkipped([]);
      change(...args);
    };

  const send = async (action: ResolveRetailPriceChangesBody['action']) => {
    const ids = [...selection.selected];
    const names = new Map(list.rows.map((row) => [row.id, row.service.name]));
    const result = await resolve.mutateAsync({ ids, action });
    selection.clear();
    setSkipped(result.skipped.map((skip) => skippedText(skip, names.get(skip.id))));
  };

  return (
    <PricingSection
      title="Price changes"
      sub="A price that follows a rule moves by itself when the cost changes a little. A bigger change waits here for you."
      right={
        <SegmentedControl
          items={SHOW_ITEMS}
          value={show}
          onChange={fresh((next: ChangesShow) => setFilter('show', next === 'all' ? 'all' : ''))}
          label="Show price changes"
        />
      }
    >
      <RetailChangesBar
        count={selection.selected.size}
        grants={grants}
        busy={resolve.isPending}
        onApply={() => void send('apply').catch(() => undefined)}
        onKeep={() => void send('keep').catch(() => undefined)}
        onClear={selection.clear}
      />
      {skipped.length > 0 && (
        <div
          className="border-b border-line bg-warn-bg px-3.5 py-2 text-sm text-warn-fg"
          role="status"
          aria-label="Skipped price changes"
        >
          <p className="font-medium">
            {skipped.length === 1 ? '1 change was skipped:' : `${skipped.length} changes were skipped:`}
          </p>
          <ul className="list-disc ps-5">
            {skipped.map((text) => (
              <li key={text}>{text}</li>
            ))}
          </ul>
        </div>
      )}
      <RetailChangesTable
        rows={list.rows}
        state={list.query.isLoading ? 'loading' : list.query.isError ? 'error' : 'ready'}
        error={list.query.error}
        onRetry={() => void list.query.refetch()}
        selection={selection}
        sort={view.sort}
        onSortChange={fresh(setSort)}
        pagination={{ page: view.page, pageSize: PAGE_SIZE, total: list.total ?? list.rows.length }}
        onPageChange={fresh(setPage)}
        empty={
          show === 'waiting' ? (
            <EmptyState
              icon="checkCircle"
              title="Nothing is waiting for you"
              cta={<Button onClick={fresh(() => setFilter('show', 'all'))}>Show every change</Button>}
            >
              A change that needs your approval shows here. Small cost changes are followed by themselves.
            </EmptyState>
          ) : (
            <EmptyState icon="history" title="No price changes yet">
              When a cost moves, the change shows here.
            </EmptyState>
          )
        }
      />
    </PricingSection>
  );
}
