// LandingTab: the "Landing pages" tab: the figures, the page type filter, the table with its row menu, and the dialogs (edit, new
// page, generate drafts). Ports `tabLanding`, `sf-kind` and `lp-menu` of 50-p-storefront.js and adds the draft generator the map
// gives. Type, search, page and sort live in the address; the server filters, sorts and counts.
import { useState } from 'react';
import { Button, EmptyState, Icon, Panel, SegmentedControl, usePageClamp } from '@/components/ui';
import { useListView } from '../hooks/useListView';
import { usePublishPage } from '../hooks/usePageMutations';
import { useStorefrontList } from '../hooks/useStorefrontList';
import type { StorefrontGrants } from '../hooks/useStorefrontGrants';
import { KIND_FILTER_ITEMS } from '../lib/kinds';
import { hasActiveFilters, LANDING_VIEW, PAGE_SIZE, toRefineFilters } from '../lib/views';
import { LANDING_KINDS, type ContentPage } from '../types';
import { ContentPageDialog } from './ContentPageDialog';
import { GenerateDialog } from './GenerateDialog';
import { LandingRowMenu } from './LandingRowMenu';
import { LandingStats } from './LandingStats';
import { LandingTable } from './LandingTable';
import { ListToolbar } from './ListToolbar';

type Dialog = { kind: 'create' } | { kind: 'edit'; page: ContentPage } | { kind: 'generate' };

/** Figures, type filter, search, table and dialogs; owns the publish request. */
export function LandingTab({ grants }: { grants: StorefrontGrants }) {
  const { view, setQuery, setFilter, clear, setPage, setSort } = useListView(LANDING_VIEW);
  const list = useStorefrontList<ContentPage>('content-pages', {
    filters: toRefineFilters(view.q, { kind: view.filters.kind || [...LANDING_KINDS] }),
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
  const publish = usePublishPage();
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const filtered = hasActiveFilters(view);
  const create = grants.needs('storefront:create');

  return (
    <>
      <LandingStats enabled={grants.can('storefront:read')} />
      <Panel
        title="Landing pages"
        sub="One page per carrier, model and free tool. This is where search traffic arrives, so thin pages are kept out of Google until they have real content."
        right={
          <div className="flex flex-wrap items-center gap-2">
            <SegmentedControl
              items={KIND_FILTER_ITEMS}
              value={view.filters.kind}
              onChange={(kind) => setFilter('kind', kind)}
              label="Page type"
            />
            <Button
              size="sm"
              disabled={create.disabled}
              title={create.title}
              onClick={() => setDialog({ kind: 'generate' })}
            >
              <Icon name="bolt" className="ic-sm" />
              Generate drafts…
            </Button>
            <Button
              variant="primary"
              size="sm"
              disabled={create.disabled}
              title={create.title}
              onClick={() => setDialog({ kind: 'create' })}
            >
              <Icon name="plus" className="ic-sm" />
              New page…
            </Button>
          </div>
        }
        flush
      >
        <ListToolbar
          query={view.q}
          onQuery={setQuery}
          placeholder="Search title or slug"
          total={list.total}
          noun={['page', 'pages']}
          filtered={filtered}
          onClear={clear}
        />
        <div className="border-t border-line">
          <LandingTable
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
                icon="globe"
                title={filtered ? 'No pages of this type' : 'No landing pages yet'}
                cta={filtered ? <Button onClick={clear}>Clear filters</Button> : undefined}
              >
                {filtered
                  ? 'Pick another type or search to see more pages.'
                  : 'Generate drafts for the carriers and phone models you sell, then publish the good ones.'}
              </EmptyState>
            }
            menu={(page) => (
              <LandingRowMenu
                page={page}
                grants={grants}
                onEdit={(target) => setDialog({ kind: 'edit', page: target })}
                onPublish={(target, published) => publish.mutate({ page: target, published })}
              />
            )}
          />
        </div>
      </Panel>
      {dialog?.kind === 'create' && (
        <ContentPageDialog kinds={LANDING_KINDS} onClose={() => setDialog(null)} />
      )}
      {dialog?.kind === 'edit' && (
        <ContentPageDialog page={dialog.page} kinds={LANDING_KINDS} onClose={() => setDialog(null)} />
      )}
      {dialog?.kind === 'generate' && <GenerateDialog onClose={() => setDialog(null)} />}
    </>
  );
}
