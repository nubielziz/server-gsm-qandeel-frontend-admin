// PagesPanel: "Pages and blog", the static pages and blog posts of the Content and legal tab: one table with Edit and the
// Publish or Unpublish button of each page. Ports `pcols` of tabContent and `pg-toggle` in 50-p-storefront.js. The demo's table
// was not sortable or paged; neither is this one (a site has a handful of pages), so it loads them whole.
import { useState } from 'react';
import { Button, DataTable, EmptyState, Icon, Panel, TypeTag, type DataTableColumn } from '@/components/ui';
import { ago } from '@/lib/format';
import { usePublishPage } from '../hooks/usePageMutations';
import { useStorefrontList } from '../hooks/useStorefrontList';
import type { StorefrontGrants } from '../hooks/useStorefrontGrants';
import { kindLabel, localeLabel, pagePath } from '../lib/kinds';
import { toRefineFilters, WHOLE_LIST_CAP } from '../lib/views';
import { CONTENT_KINDS, type ContentPage } from '../types';
import { ContentPageDialog } from './ContentPageDialog';
import { PageStatusBadge } from './PageStatusBadge';

type Dialog = { kind: 'create' } | { kind: 'edit'; page: ContentPage };

/** The pages table, its New page button and its dialogs; owns the publish request. */
export function PagesPanel({ grants }: { grants: StorefrontGrants }) {
  const list = useStorefrontList<ContentPage>('content-pages', {
    filters: toRefineFilters('', { kind: [...CONTENT_KINDS] }),
    page: 1,
    pageSize: WHOLE_LIST_CAP,
    sort: { field: 'title', order: 'asc' },
    enabled: grants.ready,
  });
  const publish = usePublishPage();
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const create = grants.needs('storefront:create');
  const update = grants.needs('storefront:update');
  const toggle = grants.needs('storefront:publish');
  const busyId = publish.isPending ? publish.variables?.page.id : undefined;

  const columns: DataTableColumn<ContentPage>[] = [
    {
      key: 'title',
      label: 'Page',
      render: (p) => (
        <>
          <p className="font-medium">{p.title}</p>
          <p className="mono text-2xs text-ink3">{pagePath(p.kind, p.slug)}</p>
        </>
      ),
    },
    { key: 'kind', label: 'Type', hide: 'sm', render: (p) => <TypeTag>{kindLabel(p.kind)}</TypeTag> },
    { key: 'status', label: 'Status', render: (p) => <PageStatusBadge status={p.status} /> },
    {
      key: 'language',
      label: 'Language',
      hide: 'md',
      render: (p) => <span className="text-ink2">{localeLabel(p.locale)}</span>,
    },
    {
      key: 'updated',
      label: 'Updated',
      hide: 'sm',
      render: (p) => <span className="text-ink2">{ago(p.updatedAt ?? p.createdAt)}</span>,
    },
    {
      key: 'actions',
      label: '',
      render: (p) => (
        <span className="flex justify-end gap-1.5">
          <Button
            size="sm"
            disabled={update.disabled}
            title={update.title}
            aria-label={`Edit ${p.title}`}
            onClick={() => setDialog({ kind: 'edit', page: p })}
          >
            Edit
          </Button>
          <Button
            size="sm"
            disabled={toggle.disabled || busyId === p.id}
            title={toggle.title}
            aria-label={`${p.status === 'published' ? 'Unpublish' : 'Publish'} ${p.title}`}
            onClick={() => publish.mutate({ page: p, published: p.status !== 'published' })}
          >
            {p.status === 'published' ? 'Unpublish' : 'Publish'}
          </Button>
        </span>
      ),
    },
  ];

  return (
    <>
      <Panel
        title="Pages and blog"
        sub="The About, contact and how-it-works pages, and the guides that bring in search traffic."
        right={
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
        }
        flush
      >
        <DataTable
          caption="Pages and blog posts"
          columns={columns}
          rows={list.rows}
          rowKey={(p) => p.id}
          state={list.query.isLoading ? 'loading' : list.query.isError ? 'error' : 'ready'}
          error={list.query.error}
          errorTitle="Could not load the pages"
          onRetry={() => void list.query.refetch()}
          empty={
            <EmptyState icon="file" title="No pages">
              Add pages and guides here.
            </EmptyState>
          }
        />
      </Panel>
      {dialog?.kind === 'create' && (
        <ContentPageDialog kinds={CONTENT_KINDS} onClose={() => setDialog(null)} />
      )}
      {dialog?.kind === 'edit' && (
        <ContentPageDialog page={dialog.page} kinds={CONTENT_KINDS} onClose={() => setDialog(null)} />
      )}
    </>
  );
}
