// PinsTable: the pinned-results rules (query, pinned and hidden services, dates and state, On switch, why, when changed, Edit and
// Delete). It only draws what it is given; the panel owns data, sort, page and the requests. New in the Search tab.
import type { ReactNode } from 'react';
import {
  Badge,
  Button,
  DataTable,
  Switch,
  type BadgeTone,
  type DataTableColumn,
  type IconName,
  type PaginationState,
  type SortState,
} from '@/components/ui';
import { fmtDate } from '@/lib/format';
import { ruleState, windowText, type RuleState } from '../../lib/search';
import type { SearchPin } from '../../types';

export interface PinsTableProps {
  rows: readonly SearchPin[];
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
  onToggle: (rule: SearchPin, enabled: boolean) => void;
  onEdit: (rule: SearchPin) => void;
  onDelete: (rule: SearchPin) => void;
}

const STATE_BADGE: Record<RuleState, { tone: BadgeTone; icon: IconName; word: string }> = {
  live: { tone: 'good', icon: 'checkCircle', word: 'Live' },
  scheduled: { tone: 'accent', icon: 'clock', word: 'Scheduled' },
  ended: { tone: 'neutral', icon: 'history', word: 'Ended' },
  off: { tone: 'neutral', icon: 'pause', word: 'Off' },
};

/** Draws the rows it is given. */
export function PinsTable({
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
}: PinsTableProps) {
  const columns: DataTableColumn<SearchPin>[] = [
    {
      key: 'query',
      label: 'Search',
      sortField: 'query',
      render: (rule) => (
        <>
          <p className="mono font-medium">{rule.query}</p>
          <p className="text-2xs text-ink3">
            {rule.match === 'exact' ? 'Exact search only' : 'Any search containing it'}
          </p>
        </>
      ),
    },
    {
      key: 'pinned',
      label: 'Pinned first',
      render: (rule) =>
        rule.pinned.length === 0 ? (
          <span className="text-ink3">–</span>
        ) : (
          <ol className="space-y-0.5">
            {[...rule.pinned]
              .sort((a, b) => a.position - b.position)
              .map((item) => (
                <li key={item.serviceId} className="text-sm">
                  <span className="mono text-ink3">{item.position}.</span> {item.title}
                </li>
              ))}
          </ol>
        ),
    },
    {
      key: 'hidden',
      label: 'Hidden',
      hide: 'md',
      render: (rule) =>
        rule.hidden.length === 0 ? (
          <span className="text-ink3">–</span>
        ) : (
          <span title={rule.hidden.map((item) => item.title).join(', ')}>
            {rule.hidden.length} {rule.hidden.length === 1 ? 'service' : 'services'}
          </span>
        ),
    },
    {
      key: 'state',
      label: 'State',
      hide: 'sm',
      render: (rule) => {
        const badge = STATE_BADGE[ruleState(rule)];
        return (
          <>
            <Badge tone={badge.tone} icon={badge.icon}>
              {badge.word}
            </Badge>
            <p className="mt-0.5 text-2xs text-ink3">{windowText(rule)}</p>
          </>
        );
      },
    },
    {
      key: 'on',
      label: 'On',
      render: (rule) => (
        <Switch
          checked={rule.isEnabled}
          disabled={lock.disabled || busyId === rule.id}
          title={lock.title}
          label={`${rule.isEnabled ? 'Switch off' : 'Switch on'} pinned results for ${rule.query}`}
          onChange={(enabled) => onToggle(rule, enabled)}
        />
      ),
    },
    {
      key: 'note',
      label: 'Why',
      hide: 'lg',
      render: (rule) =>
        rule.note ? <span className="text-ink2">{rule.note}</span> : <span className="text-ink3">–</span>,
    },
    {
      key: 'updated',
      label: 'Changed',
      hide: 'xl',
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
            aria-label={`Edit pinned results for ${rule.query}`}
            onClick={() => onEdit(rule)}
          >
            Edit
          </Button>
          <Button
            size="sm"
            variant="danger"
            disabled={lock.disabled}
            title={lock.title}
            aria-label={`Delete pinned results for ${rule.query}`}
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
      caption="Pinned results"
      columns={columns}
      rows={rows}
      rowKey={(rule) => rule.id}
      sort={sort}
      onSortChange={onSortChange}
      pagination={pagination}
      onPageChange={onPageChange}
      state={state}
      error={error}
      errorTitle="Could not load the pinned results"
      onRetry={onRetry}
      empty={empty}
    />
  );
}
