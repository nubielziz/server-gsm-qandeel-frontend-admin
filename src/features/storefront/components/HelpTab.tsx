// HelpTab: the "Help centre" tab: the figures, the search, the table with its Edit and Publish buttons, and the New article
// button. Ports `tabHelp` and `help-toggle` of 50-p-storefront.js. Search, page and sort live in the address; the server
// filters, sorts and counts.
import { useState } from 'react';
import { Button, EmptyState, Icon, Panel, usePageClamp } from '@/components/ui';
import { useSetArticlePublished } from '../hooks/useHelpMutations';
import { useListView } from '../hooks/useListView';
import { useStorefrontList } from '../hooks/useStorefrontList';
import type { StorefrontGrants } from '../hooks/useStorefrontGrants';
import { HELP_VIEW, hasActiveFilters, PAGE_SIZE, toRefineFilters } from '../lib/views';
import type { HelpArticle } from '../types';
import { HelpDialog } from './HelpDialog';
import { HelpStats } from './HelpStats';
import { HelpTable } from './HelpTable';
import { ListToolbar } from './ListToolbar';

type Dialog = { kind: 'create' } | { kind: 'edit'; article: HelpArticle };

/** Figures, search, table and dialogs; owns the publish request. */
export function HelpTab({ grants }: { grants: StorefrontGrants }) {
  const { view, setQuery, clear, setPage, setSort } = useListView(HELP_VIEW);
  const list = useStorefrontList<HelpArticle>('help-articles', {
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
  const setPublished = useSetArticlePublished();
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const filtered = hasActiveFilters(view);
  const create = grants.needs('storefront:create');

  return (
    <>
      <HelpStats enabled={grants.can('storefront:read')} />
      <Panel
        title="Help centre"
        sub="Answers that customers read before they write to support."
        right={
          <Button
            variant="primary"
            size="sm"
            disabled={create.disabled}
            title={create.title}
            onClick={() => setDialog({ kind: 'create' })}
          >
            <Icon name="plus" className="ic-sm" />
            New article…
          </Button>
        }
        flush
      >
        <ListToolbar
          query={view.q}
          onQuery={setQuery}
          placeholder="Search question or topic"
          total={list.total}
          noun={['article', 'articles']}
          filtered={filtered}
          onClear={clear}
        />
        <div className="border-t border-line">
          <HelpTable
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
                icon="life"
                title={filtered ? 'No articles match' : 'No articles yet'}
                cta={filtered ? <Button onClick={clear}>Clear filters</Button> : undefined}
              >
                {filtered ? 'Try another search.' : 'Write the five questions customers ask most.'}
              </EmptyState>
            }
            lock={grants.needs('storefront:update')}
            busyId={setPublished.isPending ? setPublished.variables?.article.id : undefined}
            onEdit={(article) => setDialog({ kind: 'edit', article })}
            onTogglePublished={(article) => setPublished.mutate({ article, published: !article.isPublished })}
          />
        </div>
      </Panel>
      {dialog?.kind === 'create' && <HelpDialog onClose={() => setDialog(null)} />}
      {dialog?.kind === 'edit' && <HelpDialog article={dialog.article} onClose={() => setDialog(null)} />}
    </>
  );
}
