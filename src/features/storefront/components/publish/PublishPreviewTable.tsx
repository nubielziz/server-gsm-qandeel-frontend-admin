// PublishPreviewTable: the table of a draft's rows ("Publish preview"): the service with its clean title and the supplier's own
// name, the three facts, the cost, the shop price with its tag, the margin, the status, the Include switch and Edit. Every figure
// and word is the server's. It only draws the rows it is given; the tab owns the data, the sort, the page and the ticked rows.
import type { ReactNode } from 'react';
import {
  Button,
  DataTable,
  Icon,
  Switch,
  type DataTableColumn,
  type RowSelection,
  type SortState,
} from '@/components/ui';
import { pct, price } from '@/lib/format';
import { THIN_MARGIN_PCT } from '../../lib/publish';
import { BLOCK_FIX, BLOCK_WORDS } from '../../lib/publishWords';
import { capital } from '../../lib/publishStatus';
import type { PublishItem } from '../../types';
import { PublishFacts, PublishPriceCell, PublishServiceCell } from './PublishItemCells';
import { PublishStatusCell } from './PublishStatusCell';

export interface PublishPreviewTableProps {
  rows: readonly PublishItem[];
  state: 'loading' | 'error' | 'ready';
  error?: unknown;
  onRetry?: () => void;
  selection: RowSelection<number>;
  sort: SortState;
  onSortChange: (sort: SortState) => void;
  empty: ReactNode;
  /** The row whose Include switch is saving: only its switch waits. */
  busyId?: number;
  onInclude: (item: PublishItem, on: boolean) => void;
  onEdit: (item: PublishItem) => void;
}

/** A tool or an app brand carries a small italic word, so staff see it is not a device maker. */
const KIND_TAG = { tool: 'Tool', app: 'App' } as const;

/** Why a blocked row cannot be ticked, and what staff can do about it. */
function blockedTitle(item: PublishItem): string {
  const reason = item.blockedReason;
  if (!reason) return 'This row cannot be published.';
  return `Cannot publish: ${BLOCK_WORDS[reason]}. ${capital(BLOCK_FIX[reason])}`.trim();
}

/** The preview's columns and states around `DataTable`. */
export function PublishPreviewTable({
  rows,
  state,
  error,
  onRetry,
  selection,
  sort,
  onSortChange,
  empty,
  busyId,
  onInclude,
  onEdit,
}: PublishPreviewTableProps) {
  const columns: DataTableColumn<PublishItem>[] = [
    {
      key: 'service',
      label: 'Service',
      sortField: 'title',
      render: (item) => <PublishServiceCell item={item} />,
    },
    {
      key: 'facts',
      label: 'Brand / Carrier / Country',
      hide: 'lg',
      render: (item) => {
        const kind = item.detected.brandKind;
        // The kind belongs to the brand the server detected: a brand staff typed over it is theirs, and carries no tag.
        const tagged = item.brand !== '' && item.brand === item.detected.brand;
        return (
          <>
            <PublishFacts item={item} />
            {tagged && (kind === 'tool' || kind === 'app') && (
              <span className="ms-1.5 text-xs italic text-ink3">{KIND_TAG[kind]}</span>
            )}
          </>
        );
      },
    },
    {
      key: 'cost',
      label: 'Cost',
      sortField: 'cost',
      num: true,
      hide: 'md',
      render: (item) => price(item.cost),
    },
    {
      key: 'price',
      label: 'Shop price',
      num: true,
      render: (item) => <PublishPriceCell item={item} amount={item.retailPrice} />,
    },
    {
      key: 'margin',
      label: 'Margin',
      num: true,
      hide: 'lg',
      render: (item) =>
        item.retailPrice !== null && item.marginPct !== null ? (
          <span
            className={
              Number(item.marginPct) < THIN_MARGIN_PCT ? 'tabular-nums text-warn-fg' : 'tabular-nums'
            }
          >
            {pct(item.marginPct)}
          </span>
        ) : (
          '–'
        ),
    },
    { key: 'status', label: 'Status', render: (item) => <PublishStatusCell item={item} /> },
    {
      key: 'include',
      label: 'Include',
      render: (item) => (
        <Switch
          checked={item.included}
          label={`Include ${item.title || item.service.name}`}
          disabled={item.state === 'blocked' || busyId === item.id}
          title={item.state === 'blocked' ? blockedTitle(item) : undefined}
          onChange={(on) => onInclude(item, on)}
        />
      ),
    },
    {
      key: 'actions',
      label: '',
      render: (item) => (
        <Button size="sm" aria-label={`Edit ${item.title || item.service.name}`} onClick={() => onEdit(item)}>
          <Icon name="edit" className="ic-xs" />
          Edit
        </Button>
      ),
    },
  ];

  return (
    <DataTable
      skin="list"
      caption="Publish preview"
      columns={columns}
      rows={rows}
      rowKey={(item) => item.id}
      selection={selection}
      sort={sort}
      onSortChange={onSortChange}
      state={state}
      error={error}
      errorTitle="Could not load the rows"
      onRetry={onRetry}
      empty={empty}
      // The footer pager under the table counts the rows.
      footer={false}
    />
  );
}
