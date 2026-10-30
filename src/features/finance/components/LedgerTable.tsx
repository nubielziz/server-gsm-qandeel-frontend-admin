// LedgerTable: the journal list with the demo's columns (time, journal, type, memo, merchant, amount, by). Ports the `cols`
// of ledgerTab in 45-p-finance.js. It only draws what it is given: the tab owns the data, the sort and the page.
import type { ReactNode } from 'react';
import {
  Avatar,
  DataTable,
  TypeTag,
  type DataTableColumn,
  type PaginationState,
  type SortState,
} from '@/components/ui';
import { fmtDate, money, sum, toAmount } from '@/lib/format';
import { journalLabel, ledgerKindLabel } from '../lib/kinds';
import type { LedgerTransaction } from '../types';

export interface LedgerTableProps {
  rows: readonly LedgerTransaction[];
  state: 'loading' | 'error' | 'ready';
  error?: unknown;
  onRetry?: () => void;
  sort: SortState;
  onSortChange: (sort: SortState) => void;
  pagination: PaginationState;
  onPageChange: (page: number) => void;
  onOpen: (entry: LedgerTransaction) => void;
  empty: ReactNode;
}

// The merchant an entry is about: the owner of its wallet line. Display only, picked from the lines the server sent.
function merchantOf(entry: LedgerTransaction): string | null {
  return entry.entries.find((line) => line.account.ownerType === 'client')?.account.ownerName ?? null;
}

// The entry's amount: its debit lines added up, which equals its credit lines because the server balances every entry.
function amountOf(entry: LedgerTransaction): number {
  return sum(
    entry.entries.filter((line) => toAmount(line.amount) > 0),
    (line) => toAmount(line.amount),
  );
}

export function LedgerTable({
  rows,
  state,
  error,
  onRetry,
  sort,
  onSortChange,
  pagination,
  onPageChange,
  onOpen,
  empty,
}: LedgerTableProps) {
  const columns: DataTableColumn<LedgerTransaction>[] = [
    {
      key: 'time',
      label: 'Time',
      sortField: 'createdAt',
      render: (entry) => <span className="mono whitespace-nowrap text-ink2">{fmtDate(entry.createdAt)}</span>,
    },
    {
      key: 'journal',
      label: 'Journal',
      sortField: 'id',
      render: (entry) => (
        <button type="button" className="link mono font-medium" onClick={() => onOpen(entry)}>
          {journalLabel(entry.id)}
        </button>
      ),
    },
    {
      key: 'kind',
      label: 'Type',
      sortField: 'kind',
      render: (entry) => <TypeTag>{ledgerKindLabel(entry.kind)}</TypeTag>,
    },
    {
      key: 'memo',
      label: 'Memo',
      hide: 'md',
      render: (entry) => <span className="block max-w-[360px] truncate text-ink2">{entry.memo}</span>,
    },
    {
      key: 'merchant',
      label: 'Merchant',
      hide: 'lg',
      render: (entry) => merchantOf(entry) ?? <span className="text-ink3">–</span>,
    },
    { key: 'amount', label: 'Amount', num: true, render: (entry) => money(amountOf(entry)) },
    {
      key: 'by',
      label: 'By',
      hide: 'xl',
      render: (entry) => {
        const by = entry.createdBy.name ?? 'System';
        return (
          <span className="inline-flex items-center gap-1.5">
            <Avatar name={by} />
            {by}
          </span>
        );
      },
    },
  ];

  return (
    <DataTable
      caption="Ledger journals"
      columns={columns}
      rows={rows}
      rowKey={(entry) => entry.id}
      onRowClick={onOpen}
      sort={sort}
      onSortChange={onSortChange}
      pagination={pagination}
      onPageChange={onPageChange}
      state={state}
      error={error}
      errorTitle="Could not load the ledger"
      onRetry={onRetry}
      empty={empty}
    />
  );
}
