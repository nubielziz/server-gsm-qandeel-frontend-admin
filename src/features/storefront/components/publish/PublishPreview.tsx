// PublishPreview: the draft of a run, the preview staff review before anything is published: the figures, the no-rule warning, the
// toolbar with Check again, the server-paged table (50 a page), the bulk actions, the row dialog and the sticky bar with Publish.
// A preview changes nothing on the shop. Every figure, price, title and slug is the server's; the console works out none.
import { useState } from 'react';
import { EmptyState, usePageClamp, Button } from '@/components/ui';
import { usePublishItems } from '../../hooks/usePublishItems';
import { useRereadPublishRun, useUpdatePublishItem } from '../../hooks/usePublishMutations';
import { usePublishSelection } from '../../hooks/usePublishSelection';
import { useListView } from '../../hooks/useListView';
import type { StorefrontGrants } from '../../hooks/useStorefrontGrants';
import { isConflict, refusalText } from '../../lib/publish';
import { bulkSelect, chipFilters, matchKey, previewFilters } from '../../lib/publishPreview';
import { hasActiveFilters, PUBLISH_ITEMS_PAGE, PUBLISH_ITEMS_VIEW } from '../../lib/views';
import type { PublishItem, PublishRun } from '../../types';
import { PublishActionBar } from './PublishActionBar';
import { PublishBulkBar } from './PublishBulkBar';
import { PublishCheckAgain } from './PublishCheckAgain';
import { PublishItemDialog } from './PublishItemDialog';
import { PublishPreviewStats } from './PublishPreviewStats';
import { PublishPreviewTable } from './PublishPreviewTable';
import { PublishPreviewToolbar } from './PublishPreviewToolbar';

export interface PublishPreviewProps {
  run: PublishRun;
  grants: StorefrontGrants;
  /** Goes to another run ("Check again" makes one). */
  onOpen: (runId: number) => void;
  /** Goes back to the start of the tab (after the draft is discarded). */
  onClose: () => void;
}

/** The whole preview: it owns the address state (search, filters, page, sort), the ticked rows and the open dialog. */
export function PublishPreview({ run, grants, onOpen, onClose }: PublishPreviewProps) {
  const { view, setQuery, setFilter, setFilters, clear, reset, setPage, setSort } =
    useListView(PUBLISH_ITEMS_VIEW);
  const filters = previewFilters(view.filters);
  const list = usePublishItems(run.id, { q: view.q, filters, page: view.page, sort: view.sort });
  usePageClamp({
    page: view.page,
    pageSize: PUBLISH_ITEMS_PAGE,
    total: list.total,
    settled: list.query.isSuccess && !list.query.isPlaceholderData,
    setPage,
  });
  const {
    selection,
    shown,
    ticked,
    allMatching,
    selectAll,
    clear: clearTicks,
  } = usePublishSelection(matchKey(view));
  const [editing, setEditing] = useState<PublishItem | null>(null);
  const [error, setError] = useState<string | null>(null);
  const update = useUpdatePublishItem(run.id);
  const reread = useRereadPublishRun();
  const filtered = hasActiveFilters(view);
  const total = list.total ?? list.rows.length;
  const pageTicked = list.rows.length > 0 && list.rows.every((row) => selection.has(row.id));

  const include = (item: PublishItem, on: boolean) => {
    setError(null);
    update.mutate(
      { itemId: item.id, body: { included: on } },
      {
        onError: (failure) => {
          setError(refusalText(failure));
          if (isConflict(failure)) reread(run.id);
        },
      },
    );
  };

  return (
    <div className="divide-y divide-line">
      <PublishPreviewStats run={run} />
      <PublishCheckAgain run={run} grants={grants} onOpen={onOpen} />
      <div>
        <PublishPreviewToolbar
          run={run}
          view={view}
          total={list.total}
          filtered={filtered}
          onQuery={setQuery}
          onChip={(chip) => setFilters(chipFilters(chip))}
          onFilter={setFilter}
          onClear={clear}
        />
        <PublishBulkBar
          runId={run.id}
          select={bulkSelect([...selection.selected], allMatching, view)}
          ticked={ticked}
          allMatching={allMatching}
          total={total}
          offerAll={pageTicked && total > list.rows.length}
          onSelectAll={selectAll}
          onClear={clearTicks}
        />
        {error && (
          <p className="border-t border-line px-3.5 py-2 text-sm text-crit-fg" role="alert">
            {error}
          </p>
        )}
        <div className="border-t border-line">
          <PublishPreviewTable
            rows={list.rows}
            state={list.query.isLoading ? 'loading' : list.query.isError ? 'error' : 'ready'}
            error={list.query.error}
            onRetry={() => void list.query.refetch()}
            selection={shown}
            sort={view.sort}
            onSortChange={setSort}
            pagination={{ page: view.page, pageSize: PUBLISH_ITEMS_PAGE, total }}
            onPageChange={setPage}
            empty={
              <EmptyState icon="filter" title="No rows here">
                {filtered ? 'No row matches the search or the filters.' : 'This preview has no rows.'}
                {filtered && (
                  <>
                    {' '}
                    <Button variant="ghost" size="sm" onClick={clear}>
                      Clear filters
                    </Button>
                  </>
                )}
              </EmptyState>
            }
            busyId={update.isPending ? update.variables?.itemId : undefined}
            onInclude={include}
            onEdit={setEditing}
          />
        </div>
      </div>
      <PublishActionBar run={run} grants={grants} onClose={onClose} onApplied={reset} />
      {editing && (
        <PublishItemDialog
          key={editing.id}
          runId={run.id}
          item={editing}
          grants={grants}
          q={view.q}
          filters={filters}
          onOpenItem={setEditing}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}
