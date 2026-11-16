// SynonymsPanel: the Synonyms section of the Search tab: the rules, the search and status filter, and the Add, Edit and Delete
// dialogs. Search, filter, page and sort live in the address; the server filters, sorts and counts. Needs storefront:read, and
// storefront:update for every change.
import { useState } from 'react';
import { ConfirmDialog, EmptyState, Button, Icon, Panel, SelectField, usePageClamp } from '@/components/ui';
import { useListView } from '../../hooks/useListView';
import { useDeleteSynonym, useSetSynonymEnabled } from '../../hooks/useSearchMutations';
import { useStorefrontList } from '../../hooks/useStorefrontList';
import type { StorefrontGrants } from '../../hooks/useStorefrontGrants';
import { synonymText } from '../../lib/search';
import { hasActiveFilters, PAGE_SIZE, SYNONYM_VIEW, toRefineFilters } from '../../lib/views';
import type { SearchSynonym } from '../../types';
import { ListToolbar } from '../ListToolbar';
import { SynonymDialog } from './SynonymDialog';
import { SynonymsTable } from './SynonymsTable';

type Dialog =
  { kind: 'create' } | { kind: 'edit'; rule: SearchSynonym } | { kind: 'delete'; rule: SearchSynonym };

const STATE_OPTIONS = [
  { value: '', label: 'All rules' },
  { value: 'on', label: 'On' },
  { value: 'off', label: 'Off' },
];

/** The synonym rules with their toolbar and dialogs; owns the switch and delete requests. */
export function SynonymsPanel({ grants }: { grants: StorefrontGrants }) {
  const { view, setQuery, setFilter, clear, setPage, setSort } = useListView(SYNONYM_VIEW);
  const state = view.filters.state;
  const list = useStorefrontList<SearchSynonym>('search-synonyms', {
    filters: toRefineFilters(view.q, { isEnabled: state === '' ? undefined : state === 'on' }),
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
  const toggle = useSetSynonymEnabled();
  const remove = useDeleteSynonym();
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const filtered = hasActiveFilters(view);
  const write = grants.needs('storefront:update');

  return (
    <>
      <Panel
        title="Synonyms"
        sub="Words visitors use for the same thing. A search for one also finds the services that match the others. Changes reach the shop within a minute."
        right={
          <Button
            variant="primary"
            size="sm"
            disabled={write.disabled}
            title={write.title}
            onClick={() => setDialog({ kind: 'create' })}
          >
            <Icon name="plus" className="ic-sm" />
            Add synonym…
          </Button>
        }
        flush
      >
        <ListToolbar
          query={view.q}
          onQuery={setQuery}
          placeholder="Search a term or a note"
          total={list.total}
          noun={['rule', 'rules']}
          filtered={filtered}
          onClear={clear}
        >
          <SelectField
            aria-label="Status"
            value={state}
            options={STATE_OPTIONS}
            onChange={(event) => setFilter('state', event.target.value)}
          />
        </ListToolbar>
        <div className="border-t border-line">
          <SynonymsTable
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
                title={filtered ? 'No synonyms match' : 'No synonyms yet'}
                cta={filtered ? <Button onClick={clear}>Clear filters</Button> : undefined}
              >
                {filtered
                  ? 'Try another search or status.'
                  : 'Add the words visitors use for the same service, such as frp and google account lock.'}
              </EmptyState>
            }
            lock={write}
            busyId={toggle.isPending ? toggle.variables?.synonym.id : undefined}
            onToggle={(rule, enabled) => toggle.mutate({ synonym: rule, enabled })}
            onEdit={(rule) => setDialog({ kind: 'edit', rule })}
            onDelete={(rule) => setDialog({ kind: 'delete', rule })}
          />
        </div>
      </Panel>
      {dialog?.kind === 'create' && <SynonymDialog onClose={() => setDialog(null)} />}
      {dialog?.kind === 'edit' && <SynonymDialog synonym={dialog.rule} onClose={() => setDialog(null)} />}
      {dialog?.kind === 'delete' && (
        <ConfirmDialog
          open
          kind="danger"
          title="Delete this synonym?"
          confirm="Delete synonym"
          body={
            <>
              <p className="mono mb-2 text-ink">{synonymText(dialog.rule)}</p>
              <p>
                Searches stop expanding to these terms within a minute. You can add the rule again later; the
                audit log keeps a record of the deletion.
              </p>
            </>
          }
          onClose={() => setDialog(null)}
          onConfirm={async () => {
            await remove.mutateAsync(dialog.rule);
          }}
        />
      )}
    </>
  );
}
