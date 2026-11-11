// WalletStatementTable: the customer's balance ledger with a running balance (when, type, memo, amount, balance, "View journal"),
// a date range, a page and a sort. The server sends every figure, including the running balance; this table only draws a page at a
// time. Its page, sort and range are the table's own state, like the merchants' statement. New in feature 21.
import { useState } from 'react';
import {
  Button,
  DataTable,
  EmptyState,
  Icon,
  TextField,
  TypeTag,
  usePageClamp,
  type DataTableColumn,
  type SortState,
} from '@/components/ui';
import { journalLabel, ledgerKindLabel } from '@/features/finance';
import { fmtDate, money, toAmount } from '@/lib/format';
import type { CustomerGrants } from '../hooks/useCustomerGrants';
import { useCustomerWalletStatement } from '../hooks/useCustomerWallet';
import { hasRange, isBackwards, NO_RANGE, type DateRange } from '../lib/walletStatement';
import type { CustomerDetail, WalletStatementRow } from '../types';
import { WalletJournalDialog } from './WalletJournalDialog';

const NEWEST_FIRST: SortState = { field: 'createdAt', order: 'desc' };
const PAGE_SIZE = 10;

/** Draws the statement a page at a time, with the date range above it, and owns the journal dialog. */
export function WalletStatementTable({
  customer,
  grants,
}: {
  customer: Pick<CustomerDetail, 'id'>;
  grants: CustomerGrants;
}) {
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<SortState>(NEWEST_FIRST);
  const [range, setRange] = useState<DateRange>(NO_RANGE);
  const [journal, setJournal] = useState<WalletStatementRow | null>(null);
  const ledgerLock = grants.needs('ledger:read');
  const statement = useCustomerWalletStatement({
    customerId: customer.id,
    page,
    pageSize: PAGE_SIZE,
    sort,
    range,
    enabled: grants.can('wallet:read'),
  });
  const rows = statement.data?.data ?? [];
  const total = statement.data?.total;
  usePageClamp({
    page,
    pageSize: PAGE_SIZE,
    total,
    settled: statement.isSuccess && !statement.isPlaceholderData,
    setPage,
  });
  const backwards = isBackwards(range);
  const change = (next: Partial<DateRange>) => {
    setRange((current) => ({ ...current, ...next }));
    setPage(1);
  };

  const columns: DataTableColumn<WalletStatementRow>[] = [
    {
      key: 'ts',
      label: 'When',
      sortField: 'createdAt',
      render: (row) => <span className="tabular-nums">{fmtDate(row.createdAt)}</span>,
    },
    { key: 'kind', label: 'Type', render: (row) => <TypeTag>{ledgerKindLabel(row.kind)}</TypeTag> },
    {
      key: 'memo',
      label: 'Memo',
      hide: 'md',
      render: (row) => <span className="block max-w-[320px] truncate text-ink2">{row.memo}</span>,
    },
    {
      key: 'amount',
      label: 'Amount',
      num: true,
      render: (row) => {
        const amount = toAmount(row.amount);
        return (
          <span className={`font-medium ${amount < 0 ? '' : 'text-good-fg'}`}>
            {amount > 0 ? '+' : ''}
            {money(amount)}
          </span>
        );
      },
    },
    { key: 'balance', label: 'Balance', num: true, hide: 'sm', render: (row) => money(row.balanceAfter) },
    {
      key: 'journal',
      label: '',
      className: 'w-10',
      render: (row) => (
        <Button
          variant="ghost"
          size="sm"
          icon
          aria-label={`View journal ${journalLabel(row.transactionId)}`}
          disabled={ledgerLock.disabled}
          title={ledgerLock.title}
          onClick={() => setJournal(row)}
        >
          <Icon name="receipt" className="ic-sm" />
        </Button>
      ),
    },
  ];

  return (
    <>
      <div className="flex flex-wrap items-end gap-3 p-3">
        <TextField
          label="From"
          type="date"
          value={range.from}
          onChange={(event) => change({ from: event.target.value })}
        />
        <TextField
          label="To"
          type="date"
          value={range.to}
          error={backwards ? 'The end is before the start.' : undefined}
          onChange={(event) => change({ to: event.target.value })}
        />
        {hasRange(range) && (
          <Button variant="ghost" size="sm" onClick={() => change(NO_RANGE)}>
            Clear dates
          </Button>
        )}
      </div>
      <DataTable
        caption="Balance statement"
        columns={columns}
        rows={rows}
        rowKey={(row) => row.id}
        sort={sort}
        onSortChange={(next) => {
          setSort(next);
          setPage(1);
        }}
        pagination={{ page, pageSize: PAGE_SIZE, total: total ?? rows.length }}
        onPageChange={setPage}
        state={statement.isLoading ? 'loading' : statement.isError ? 'error' : 'ready'}
        error={statement.error}
        errorTitle="Could not load the statement"
        onRetry={() => void statement.refetch()}
        empty={
          <EmptyState icon="wallet" title="No balance activity">
            {hasRange(range)
              ? 'Nothing was posted in these dates.'
              : 'Top-ups, payments, refunds and adjustments appear here with a running balance.'}
          </EmptyState>
        }
      />
      {journal && (
        <WalletJournalDialog transactionId={journal.transactionId} onClose={() => setJournal(null)} />
      )}
    </>
  );
}
