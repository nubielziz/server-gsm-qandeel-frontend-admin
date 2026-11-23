// RetailChangesTable: the price changes the server made or proposes: the service, what happened (a square and words), the cost and the shop
// price before and after, the rule and when. It draws what it is given; every figure and every word of why is the server's. A row can be
// ticked so the proposals that wait are approved or kept together. The footer pager is the section's.
import type { ReactNode } from 'react';
import { DataTable, type DataTableColumn, type RowSelection, type SortState } from '@/components/ui';
import { fmtDate, price } from '@/lib/format';
import { changeWords } from '../../lib/retailPricing';
import type { RetailPriceChange } from '../../types';
import { StatusMark } from '../StatusMark';

export interface RetailChangesTableProps {
  rows: readonly RetailPriceChange[];
  state: 'loading' | 'error' | 'ready';
  error?: unknown;
  onRetry: () => void;
  selection: RowSelection<number>;
  sort: SortState;
  onSortChange: (sort: SortState) => void;
  empty: ReactNode;
}

/** "$13.50 to $19.80", or "$13.50 to –" when there is no new figure. */
function Move({ from, to }: { from: string; to: string | null }) {
  return (
    <span className="whitespace-nowrap">
      {price(from)} <span className="text-ink3">to</span>{' '}
      {to === null ? <span className="text-ink3">–</span> : <span className="font-medium">{price(to)}</span>}
    </span>
  );
}

const COLUMNS: DataTableColumn<RetailPriceChange>[] = [
  {
    key: 'service',
    label: 'Service',
    render: (change) => (
      <>
        <span className="block max-w-[260px] truncate font-medium">{change.service.name}</span>
        <span className="mono text-xs text-ink3">{change.service.code}</span>
      </>
    ),
  },
  {
    key: 'what',
    label: 'What happened',
    render: (change) => {
      const words = changeWords(change);
      return (
        <>
          <StatusMark tone={words.tone}>{words.label}</StatusMark>
          {words.note && <span className="cell-sub">{words.note}</span>}
        </>
      );
    },
  },
  {
    key: 'cost',
    label: 'Cost',
    num: true,
    hide: 'md',
    render: (c) => <Move from={c.oldCost} to={c.newCost} />,
  },
  { key: 'price', label: 'Shop price', num: true, render: (c) => <Move from={c.oldPrice} to={c.newPrice} /> },
  {
    key: 'rule',
    label: 'Rule',
    hide: 'lg',
    render: (change) => (change.rule ? change.rule.label : <span className="text-ink3">–</span>),
  },
  {
    key: 'when',
    label: 'When',
    sortField: 'createdAt',
    hide: 'sm',
    render: (change) => <span className="whitespace-nowrap text-ink2">{fmtDate(change.createdAt)}</span>,
  },
];

/** Draws the price changes; the section owns the data, the sort, the page and the ticks. */
export function RetailChangesTable({
  rows,
  state,
  error,
  onRetry,
  selection,
  sort,
  onSortChange,
  empty,
}: RetailChangesTableProps) {
  return (
    <DataTable
      skin="list"
      footer={false}
      caption="Price changes"
      columns={COLUMNS}
      rows={rows}
      rowKey={(change) => change.id}
      selection={selection}
      sort={sort}
      onSortChange={onSortChange}
      state={state}
      error={error}
      errorTitle="Could not load the price changes"
      onRetry={onRetry}
      empty={empty}
    />
  );
}
