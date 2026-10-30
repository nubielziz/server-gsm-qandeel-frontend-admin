// TacTab: the "TAC catalogue" tab (new in the map): the search, the table with its Edit buttons, and the Add TAC and Edit dialogs.
// Search, page and sort live in the address; the server filters, sorts and counts. Needs catalog:read.
import { useState } from 'react';
import { Button, EmptyState, Icon, Panel, usePageClamp } from '@/components/ui';
import { useListView } from '../hooks/useListView';
import { useStorefrontList } from '../hooks/useStorefrontList';
import type { StorefrontGrants } from '../hooks/useStorefrontGrants';
import { hasActiveFilters, PAGE_SIZE, TAC_VIEW, toRefineFilters } from '../lib/views';
import type { TacEntry } from '../types';
import { ListToolbar } from './ListToolbar';
import { TacDialog } from './TacDialog';
import { TacTable } from './TacTable';

type Dialog = { kind: 'create' } | { kind: 'edit'; entry: TacEntry };

/** Search, table and dialogs. */
export function TacTab({ grants }: { grants: StorefrontGrants }) {
  const { view, setQuery, clear, setPage, setSort } = useListView(TAC_VIEW);
  const list = useStorefrontList<TacEntry>('tac-catalog', {
    filters: toRefineFilters(view.q),
    page: view.page,
    pageSize: PAGE_SIZE,
    sort: view.sort,
    enabled: grants.ready,
  });
  usePageClamp({
    page: view.page,
    pageSize: PAGE_SIZE,
    total: list.total,
    settled: list.query.isSuccess && !list.query.isPlaceholderData,
    setPage,
  });
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const filtered = hasActiveFilters(view);
  const create = grants.needs('catalog:create');

  return (
    <>
      <Panel
        title="TAC catalogue"
        sub="The first 8 digits of an IMEI tell which phone it is. The IMEI checker and the landing page generator read this table to name the model."
        right={
          <Button
            variant="primary"
            size="sm"
            disabled={create.disabled}
            title={create.title}
            onClick={() => setDialog({ kind: 'create' })}
          >
            <Icon name="plus" className="ic-sm" />
            Add TAC…
          </Button>
        }
        flush
      >
        <ListToolbar
          query={view.q}
          onQuery={setQuery}
          placeholder="Search TAC, brand or model"
          total={list.total}
          noun={['TAC', 'TACs']}
          filtered={filtered}
          onClear={clear}
        />
        <div className="border-t border-line">
          <TacTable
            rows={list.rows}
            state={list.query.isLoading ? 'loading' : list.query.isError ? 'error' : 'ready'}
            error={list.query.error}
            onRetry={() => void list.query.refetch()}
            sort={view.sort}
            onSortChange={setSort}
            pagination={{ page: view.page, pageSize: PAGE_SIZE, total: list.total ?? list.rows.length }}
            onPageChange={setPage}
            empty={
              <EmptyState
                icon="search"
                title={filtered ? 'No TACs match' : 'No TACs yet'}
                cta={filtered ? <Button onClick={clear}>Clear filters</Button> : undefined}
              >
                {filtered
                  ? 'Try another search.'
                  : 'Add the first 8 digits of an IMEI with its brand and model.'}
              </EmptyState>
            }
            lock={grants.needs('catalog:update')}
            onEdit={(entry) => setDialog({ kind: 'edit', entry })}
          />
        </div>
      </Panel>
      {dialog?.kind === 'create' && <TacDialog onClose={() => setDialog(null)} />}
      {dialog?.kind === 'edit' && <TacDialog entry={dialog.entry} onClose={() => setDialog(null)} />}
    </>
  );
}
