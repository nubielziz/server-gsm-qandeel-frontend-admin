// HelpTable: the help articles table with the demo's columns (question, topic, helpful bar, votes, status, Publish) and the Edit
// button the map adds. Ports `cols` of tabHelp in 50-p-storefront.js. It only draws what it is given; the tab owns data, sort and page.
import type { ReactNode } from 'react';
import {
  Button,
  DataTable,
  TypeTag,
  type DataTableColumn,
  type PaginationState,
  type SortState,
} from '@/components/ui';
import { num, pct } from '@/lib/format';
import { helpfulPct, needsRewrite, voteCount, WEAK_BELOW_PCT } from '../lib/help';
import type { HelpArticle } from '../types';
import { PublishedBadge } from './PublishedBadge';

export interface HelpTableProps {
  rows: readonly HelpArticle[];
  state: 'loading' | 'error' | 'ready';
  error?: unknown;
  onRetry?: () => void;
  sort: SortState;
  onSortChange: (sort: SortState) => void;
  pagination: PaginationState;
  onPageChange: (page: number) => void;
  empty: ReactNode;
  /** Props for the Edit button when the staff member lacks `storefront:update`; the Publish button needs the same. */
  lock: { disabled: boolean; title?: string };
  /** The article whose publish button is saving. */
  busyId?: number;
  onEdit: (article: HelpArticle) => void;
  onTogglePublished: (article: HelpArticle) => void;
}

/** Draws the rows it is given, with the demo's columns. */
export function HelpTable({
  rows,
  state,
  error,
  onRetry,
  sort,
  onSortChange,
  pagination,
  onPageChange,
  empty,
  lock,
  busyId,
  onEdit,
  onTogglePublished,
}: HelpTableProps) {
  const columns: DataTableColumn<HelpArticle>[] = [
    {
      key: 'question',
      label: 'Question',
      sortField: 'question',
      render: (a) => (
        <>
          <p className="font-medium">{a.question}</p>
          {needsRewrite(a) && (
            <p className="text-2xs font-medium text-warn-fg">Most readers said this did not help</p>
          )}
        </>
      ),
    },
    {
      key: 'topic',
      label: 'Topic',
      hide: 'sm',
      sortField: 'category',
      render: (a) => <TypeTag>{a.category}</TypeTag>,
    },
    {
      key: 'helpful',
      label: 'Helpful',
      num: true,
      render: (a) => {
        const share = helpfulPct(a);
        return (
          <div className="flex items-center justify-end gap-2">
            <div className="meter w-14" role="presentation">
              <i
                className={share < WEAK_BELOW_PCT ? 'bg-warn-dot' : 'bg-good-dot'}
                style={{ width: `${share}%` }}
              />
            </div>
            <span className="tabular-nums">{pct(share, 0)}</span>
          </div>
        );
      },
    },
    { key: 'votes', label: 'Votes', num: true, hide: 'md', render: (a) => num(voteCount(a)) },
    {
      key: 'status',
      label: 'Status',
      sortField: 'isPublished',
      render: (a) => <PublishedBadge published={a.isPublished} />,
    },
    {
      key: 'actions',
      label: '',
      render: (a) => (
        <span className="flex justify-end gap-1.5">
          <Button
            size="sm"
            disabled={lock.disabled}
            title={lock.title}
            aria-label={`Edit ${a.question}`}
            onClick={() => onEdit(a)}
          >
            Edit
          </Button>
          <Button
            size="sm"
            disabled={lock.disabled || busyId === a.id}
            title={lock.title}
            aria-label={`${a.isPublished ? 'Unpublish' : 'Publish'} ${a.question}`}
            onClick={() => onTogglePublished(a)}
          >
            {a.isPublished ? 'Unpublish' : 'Publish'}
          </Button>
        </span>
      ),
    },
  ];

  return (
    <DataTable
      caption="Help articles"
      columns={columns}
      rows={rows}
      rowKey={(a) => a.id}
      sort={sort}
      onSortChange={onSortChange}
      pagination={pagination}
      onPageChange={onPageChange}
      state={state}
      error={error}
      errorTitle="Could not load the help articles"
      onRetry={onRetry}
      empty={empty}
    />
  );
}
