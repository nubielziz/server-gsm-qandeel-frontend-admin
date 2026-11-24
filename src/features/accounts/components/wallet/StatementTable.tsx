// StatementTable: the wallet's ledger with a running balance in the list skin: When, Type, Memo (with the order's link), Amount, Balance and the
// button that opens the journal behind the line. The server sends every figure, including the running balance; the table only draws a page.
import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { Button, DataTable, Icon, type DataTableColumn, type SortState } from '@/components/ui';
import { journalLabel, ledgerKindLabel } from '@/features/finance';
import { orderPath } from '@/features/orders';
import { fmtDate, money } from '@/lib/format';
import type { GrantLock } from '../frame/useAccountGrants';
import type { StatementRow } from '../../types';
import { isNegative, signedAmount } from './walletText';

export interface StatementTableProps {
  rows: readonly StatementRow[];
  state: 'loading' | 'error' | 'ready';
  error?: unknown;
  onRetry: () => void;
  sort: SortState;
  onSort: (sort: SortState) => void;
  /** The lock of "View journal": it needs `ledger:read`. */
  ledgerLock: GrantLock;
  onJournal: (row: StatementRow) => void;
  empty: ReactNode;
}

/**
 * One page of the statement. The balance of a line below zero is in the critical colour with the alert icon.
 *
 * @param props see `StatementTableProps`.
 */
export function StatementTable({
  rows,
  state,
  error,
  onRetry,
  sort,
  onSort,
  ledgerLock,
  onJournal,
  empty,
}: StatementTableProps) {
  const columns: DataTableColumn<StatementRow>[] = [
    {
      key: 'when',
      label: 'When',
      sortField: 'createdAt',
      render: (row) => <span className="tabular-nums">{fmtDate(row.createdAt)}</span>,
    },
    { key: 'type', label: 'Type', render: (row) => ledgerKindLabel(row.kind) },
    {
      key: 'memo',
      label: 'Memo',
      hide: 'md',
      render: (row) => (
        <>
          <span className="block max-w-[320px] truncate text-ink2">{row.memo}</span>
          {row.orderId ? (
            <Link className="link cell-sub" to={orderPath(row.orderId)}>
              Order #{row.orderId}
            </Link>
          ) : null}
        </>
      ),
    },
    {
      key: 'amount',
      label: 'Amount',
      num: true,
      render: (row) => {
        const { text, direction } = signedAmount(row.amount);
        return (
          <span className={direction === 'in' ? 'font-medium text-good-fg' : 'font-medium'}>{text}</span>
        );
      },
    },
    {
      key: 'balance',
      label: 'Balance',
      num: true,
      hide: 'sm',
      render: (row) =>
        isNegative(row.balanceAfter) ? (
          <span className="font-medium text-crit-fg">
            <Icon name="alert" className="ic-xs me-1 inline" />
            {money(row.balanceAfter)}
          </span>
        ) : (
          money(row.balanceAfter)
        ),
    },
    {
      key: 'journal',
      label: 'Journal',
      render: (row) => (
        <Button
          variant="ghost"
          size="sm"
          aria-label={`View journal ${journalLabel(row.transactionId)}`}
          disabled={ledgerLock.disabled}
          title={ledgerLock.title}
          onClick={() => onJournal(row)}
        >
          View journal
        </Button>
      ),
    },
  ];

  return (
    <DataTable
      skin="list"
      footer={false}
      caption="Statement"
      columns={columns}
      rows={rows}
      rowKey={(row) => row.id}
      sort={sort}
      onSortChange={onSort}
      state={state}
      error={error}
      errorTitle="Could not load the statement"
      onRetry={onRetry}
      empty={empty}
    />
  );
}
