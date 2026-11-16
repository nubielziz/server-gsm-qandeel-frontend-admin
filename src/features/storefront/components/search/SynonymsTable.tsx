// SynonymsTable: the synonym rules (terms, kind, On switch, why, when changed, Edit and Delete). It only draws what it is given;
// the panel owns data, sort, page and the requests. New in the Search tab.
import type { ReactNode } from 'react';
import {
  Badge,
  Button,
  DataTable,
  Switch,
  type DataTableColumn,
  type PaginationState,
  type SortState,
} from '@/components/ui';
import { fmtDate } from '@/lib/format';
import { synonymText } from '../../lib/search';
import type { SearchSynonym } from '../../types';

export interface SynonymsTableProps {
  rows: readonly SearchSynonym[];
  state: 'loading' | 'error' | 'ready';
  error?: unknown;
  onRetry?: () => void;
  sort: SortState;
  onSortChange: (sort: SortState) => void;
  pagination: PaginationState;
  onPageChange: (page: number) => void;
  empty: ReactNode;
  /** Props for the switch, Edit and Delete when the staff member lacks `storefront:update`. */
  lock: { disabled: boolean; title?: string };
  /** The rule whose switch request is running. */
  busyId?: number;
  onToggle: (rule: SearchSynonym, enabled: boolean) => void;
  onEdit: (rule: SearchSynonym) => void;
  onDelete: (rule: SearchSynonym) => void;
}

/** The terms of a rule as chips: `a = b = c`, or the root, an arrow and the terms it also finds. */
function Terms({ rule }: { rule: SearchSynonym }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {rule.kind === 'one_way' && rule.root && (
        <>
          <span className="chip">{rule.root}</span>
          <span aria-label="also finds" className="text-ink3">
            →
          </span>
        </>
      )}
      {rule.terms.map((term, index) => (
        <span key={term} className="inline-flex items-center gap-1.5">
          {rule.kind === 'multi' && index > 0 && <span className="text-ink3">=</span>}
          <span className="chip">{term}</span>
        </span>
      ))}
    </div>
  );
}

/** Draws the rows it is given. */
export function SynonymsTable({
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
  onToggle,
  onEdit,
  onDelete,
}: SynonymsTableProps) {
  const columns: DataTableColumn<SearchSynonym>[] = [
    { key: 'terms', label: 'Terms', render: (rule) => <Terms rule={rule} /> },
    {
      key: 'kind',
      label: 'Kind',
      hide: 'sm',
      render: (rule) =>
        rule.kind === 'one_way' ? (
          <Badge tone="accent">One way</Badge>
        ) : (
          <Badge tone="neutral">Same meaning</Badge>
        ),
    },
    {
      key: 'on',
      label: 'On',
      render: (rule) => (
        <Switch
          checked={rule.isEnabled}
          disabled={lock.disabled || busyId === rule.id}
          title={lock.title}
          label={`${rule.isEnabled ? 'Switch off' : 'Switch on'} synonym ${synonymText(rule)}`}
          onChange={(enabled) => onToggle(rule, enabled)}
        />
      ),
    },
    {
      key: 'note',
      label: 'Why',
      hide: 'md',
      render: (rule) =>
        rule.note ? <span className="text-ink2">{rule.note}</span> : <span className="text-ink3">–</span>,
    },
    {
      key: 'updated',
      label: 'Changed',
      hide: 'lg',
      sortField: 'updatedAt',
      render: (rule) => <span className="whitespace-nowrap text-ink2">{fmtDate(rule.updatedAt)}</span>,
    },
    {
      key: 'actions',
      label: '',
      render: (rule) => (
        <div className="flex justify-end gap-1.5">
          <Button
            size="sm"
            disabled={lock.disabled}
            title={lock.title}
            aria-label={`Edit synonym ${synonymText(rule)}`}
            onClick={() => onEdit(rule)}
          >
            Edit
          </Button>
          <Button
            size="sm"
            variant="danger"
            disabled={lock.disabled}
            title={lock.title}
            aria-label={`Delete synonym ${synonymText(rule)}`}
            onClick={() => onDelete(rule)}
          >
            Delete
          </Button>
        </div>
      ),
    },
  ];

  return (
    <DataTable
      caption="Search synonyms"
      columns={columns}
      rows={rows}
      rowKey={(rule) => rule.id}
      sort={sort}
      onSortChange={onSortChange}
      pagination={pagination}
      onPageChange={onPageChange}
      state={state}
      error={error}
      errorTitle="Could not load the synonyms"
      onRetry={onRetry}
      empty={empty}
    />
  );
}
