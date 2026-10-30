// LandingTable: the landing pages table with the demo's columns (page and path, type, status, visits, orders, visit to order,
// language, updated, the row menu). Ports `cols` of tabLanding in 50-p-storefront.js. It only draws what it is given; the tab owns
// data, sort and page.
import type { ReactNode } from 'react';
import {
  DataTable,
  TypeTag,
  type DataTableColumn,
  type PaginationState,
  type SortState,
} from '@/components/ui';
import { ago, num, pct } from '@/lib/format';
import { kindLabel, localeLabel, pagePath } from '../lib/kinds';
import type { ContentPage } from '../types';
import { PageStatusBadge } from './PageStatusBadge';

export interface LandingTableProps {
  rows: readonly ContentPage[];
  state: 'loading' | 'error' | 'ready';
  error?: unknown;
  onRetry?: () => void;
  sort: SortState;
  onSortChange: (sort: SortState) => void;
  pagination: PaginationState;
  onPageChange: (page: number) => void;
  empty: ReactNode;
  /** The "⋯" menu of a row. */
  menu: (page: ContentPage) => ReactNode;
}

/** Draws the rows it is given, with the demo's columns. */
export function LandingTable({
  rows,
  state,
  error,
  onRetry,
  sort,
  onSortChange,
  pagination,
  onPageChange,
  empty,
  menu,
}: LandingTableProps) {
  const columns: DataTableColumn<ContentPage>[] = [
    {
      key: 'title',
      label: 'Page',
      sortField: 'title',
      render: (p) => (
        <>
          <p className="font-medium">{p.title}</p>
          <p className="mono text-2xs text-ink3">{pagePath(p.kind, p.slug)}</p>
        </>
      ),
    },
    { key: 'kind', label: 'Type', hide: 'sm', render: (p) => <TypeTag>{kindLabel(p.kind)}</TypeTag> },
    {
      key: 'status',
      label: 'Status',
      sortField: 'status',
      render: (p) => <PageStatusBadge status={p.status} />,
    },
    {
      key: 'visits',
      label: 'Visits',
      num: true,
      render: (p) => (p.visits30d ? num(p.visits30d) : <span className="text-ink3">0</span>),
    },
    {
      key: 'orders',
      label: 'Orders',
      num: true,
      hide: 'sm',
      render: (p) => num(p.orders30d ?? 0),
    },
    {
      key: 'conversion',
      label: 'Visit to order',
      num: true,
      hide: 'md',
      // Orders over visits is the demo's display ratio; both numbers are the server's.
      render: (p) => (p.visits30d ? pct(((p.orders30d ?? 0) / p.visits30d) * 100) : '–'),
    },
    {
      key: 'language',
      label: 'Language',
      hide: 'xl',
      render: (p) => <span className="text-ink2">{localeLabel(p.locale)}</span>,
    },
    {
      key: 'updated',
      label: 'Updated',
      hide: 'lg',
      sortField: 'updatedAt',
      render: (p) => <span className="text-ink2">{ago(p.updatedAt ?? p.createdAt)}</span>,
    },
    { key: 'more', label: '', className: 'w-10', render: menu },
  ];

  return (
    <DataTable
      caption="Landing pages"
      columns={columns}
      rows={rows}
      rowKey={(p) => p.id}
      sort={sort}
      onSortChange={onSortChange}
      pagination={pagination}
      onPageChange={onPageChange}
      state={state}
      error={error}
      errorTitle="Could not load the landing pages"
      onRetry={onRetry}
      empty={empty}
    />
  );
}
