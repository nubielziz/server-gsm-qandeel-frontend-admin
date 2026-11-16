// PinsPanel: the Pinned results section of the Search tab: the "Test a search" box, the rules, the search and status filter, and
// the Add, Edit and Delete dialogs. Search, filter, page and sort live in the address; the server filters, sorts and counts.
// Needs storefront:read, and storefront:update for every change.
import { useState } from 'react';
import { Button, ConfirmDialog, EmptyState, Icon, Panel, SelectField, usePageClamp } from '@/components/ui';
import { useListView } from '../../hooks/useListView';
import { useDeletePin, useSetPinEnabled } from '../../hooks/useSearchMutations';
import { useStorefrontList } from '../../hooks/useStorefrontList';
import type { StorefrontGrants } from '../../hooks/useStorefrontGrants';
import { hasActiveFilters, PAGE_SIZE, PIN_VIEW, toRefineFilters } from '../../lib/views';
import type { SearchPin } from '../../types';
import { ListToolbar } from '../ListToolbar';
import { PinDialog } from './PinDialog';
import { PinsTable } from './PinsTable';
import { SearchPreview } from './SearchPreview';

type Dialog = { kind: 'create' } | { kind: 'edit'; rule: SearchPin } | { kind: 'delete'; rule: SearchPin };

const STATE_OPTIONS = [
  { value: '', label: 'All rules' },
  { value: 'on', label: 'On' },
  { value: 'off', label: 'Off' },
];

/** The preview box and the pinned-results rules with their toolbar and dialogs; owns the switch and delete requests. */
export function PinsPanel({ grants }: { grants: StorefrontGrants }) {
  const { view, setQuery, setFilter, clear, setPage, setSort } = useListView(PIN_VIEW);
  const state = view.filters.state;
  const list = useStorefrontList<SearchPin>('search-pins', {
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
  const toggle = useSetPinEnabled();
  const remove = useDeletePin();
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const filtered = hasActiveFilters(view);
  const write = grants.needs('storefront:update');

  return (
    <>
      <SearchPreview grants={grants} />
      <Panel
        title="Pinned results"
        sub="For a search, put chosen services first at fixed positions and keep others out. Use it for the services you want visitors to see, or to remove one that keeps turning up by mistake."
        right={
          <Button
            variant="primary"
            size="sm"
            disabled={write.disabled}
            title={write.title}
            onClick={() => setDialog({ kind: 'create' })}
          >
            <Icon name="plus" className="ic-sm" />
            Add pinned results…
          </Button>
        }
        flush
      >
        <ListToolbar
          query={view.q}
          onQuery={setQuery}
          placeholder="Search a query or a note"
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
          <PinsTable
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
                icon="tag"
                title={filtered ? 'No pinned results match' : 'No pinned results yet'}
                cta={filtered ? <Button onClick={clear}>Clear filters</Button> : undefined}
              >
                {filtered
                  ? 'Try another search or status.'
                  : 'Pick the words visitors search for and the services that should come first.'}
              </EmptyState>
            }
            lock={write}
            busyId={toggle.isPending ? toggle.variables?.pin.id : undefined}
            onToggle={(rule, enabled) => toggle.mutate({ pin: rule, enabled })}
            onEdit={(rule) => setDialog({ kind: 'edit', rule })}
            onDelete={(rule) => setDialog({ kind: 'delete', rule })}
          />
        </div>
      </Panel>
      {dialog?.kind === 'create' && <PinDialog onClose={() => setDialog(null)} />}
      {dialog?.kind === 'edit' && <PinDialog pin={dialog.rule} onClose={() => setDialog(null)} />}
      {dialog?.kind === 'delete' && (
        <ConfirmDialog
          open
          kind="danger"
          title="Delete these pinned results?"
          confirm="Delete rule"
          body={
            <>
              <p className="mono mb-2 text-ink">{dialog.rule.query}</p>
              <p>
                The search goes back to its normal order within a minute. You can add the rule again later;
                the audit log keeps a record of the deletion.
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
