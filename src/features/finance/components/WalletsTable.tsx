// WalletsTable: the store balances list (account, balance, state, updated). Each account links to the Financial part of its record
// (`accountPath(id, 'wallet')`). It only draws what it is given: the tab owns the data, the sort and the page.
import type { ReactNode } from 'react';
import { Link } from 'react-router';
import {
  Badge,
  DataTable,
  type DataTableColumn,
  type PaginationState,
  type SortState,
} from '@/components/ui';
import { accountPath } from '@/features/accounts';
import { ago, hasAccountName, maskedAccountLabel, maskEmail, money, toAmount } from '@/lib/format';
import { walletStateOf } from '../lib/walletView';
import type { CustomerWalletRow } from '../types';

export interface WalletsTableProps {
  rows: readonly CustomerWalletRow[];
  state: 'loading' | 'error' | 'ready';
  error?: unknown;
  onRetry?: () => void;
  /** From `useNow`, so the ages move together and a test can fix them. */
  now: number;
  sort: SortState;
  onSortChange: (sort: SortState) => void;
  pagination: PaginationState;
  onPageChange: (page: number) => void;
  empty: ReactNode;
}

/** The state of a wallet as a badge: a word and an icon, never a colour alone. */
function StateBadge({ row }: { row: CustomerWalletRow }) {
  const state = walletStateOf(row);
  if (state === 'frozen') {
    return (
      <Badge tone="crit" icon="lock">
        On hold
      </Badge>
    );
  }
  if (state === 'negative') {
    return (
      <Badge tone="serious" icon="alert">
        Below zero
      </Badge>
    );
  }
  return state === 'positive' ? (
    <Badge tone="good" icon="checkCircle">
      With balance
    </Badge>
  ) : (
    <Badge tone="neutral">Empty</Badge>
  );
}

export function WalletsTable({
  rows,
  state,
  error,
  onRetry,
  now,
  sort,
  onSortChange,
  pagination,
  onPageChange,
  empty,
}: WalletsTableProps) {
  const columns: DataTableColumn<CustomerWalletRow>[] = [
    {
      key: 'account',
      label: 'Account',
      render: (row) => (
        <>
          <Link className="link font-medium" to={accountPath(row.customer.id, 'wallet')}>
            {maskedAccountLabel(row.customer)}
          </Link>
          <p className="text-xs text-ink3">
            {hasAccountName(row.customer) ? maskEmail(row.customer.email) : 'No name'}
          </p>
        </>
      ),
    },
    {
      key: 'balance',
      label: 'Balance',
      num: true,
      sortField: 'balance',
      render: (row) => (
        <span className={toAmount(row.balance) < 0 ? 'font-medium text-crit-fg' : 'font-medium'}>
          {money(row.balance)}
        </span>
      ),
    },
    {
      key: 'state',
      label: 'State',
      render: (row) => (
        <>
          <StateBadge row={row} />
          {row.frozen && (
            <p className="max-w-[320px] truncate py-0.5 text-xs text-ink3">{row.frozen.reason}</p>
          )}
        </>
      ),
    },
    {
      key: 'updated',
      label: 'Updated',
      hide: 'md',
      sortField: 'updatedAt',
      render: (row) => <span className="whitespace-nowrap text-ink2">{ago(row.updatedAt, now)}</span>,
    },
  ];

  return (
    <DataTable
      caption="Store balances"
      columns={columns}
      rows={rows}
      rowKey={(row) => row.customer.id}
      sort={sort}
      onSortChange={onSortChange}
      pagination={pagination}
      onPageChange={onPageChange}
      state={state}
      error={error}
      errorTitle="Could not load the store balances"
      onRetry={onRetry}
      empty={empty}
    />
  );
}
