// StatementTable: the merchant's wallet ledger with a running balance (when, type, memo, amount, balance, "View journal"). Ports the
// `cols` of merWalletTab in 42-p-merchants.js. The server sends every figure, including the running balance; this table only
// draws a page at a time. Its page and sort are the table's own state, like the orders table inside a merchant's page.
import { useState } from 'react';
import {
  Button,
  DataTable,
  EmptyState,
  Icon,
  TypeTag,
  usePageClamp,
  type DataTableColumn,
  type SortState,
} from '@/components/ui';
import { journalLabel, ledgerKindLabel } from '@/features/finance';
import { fmtDate, money, toAmount } from '@/lib/format';
import { useClientStatement } from '../hooks/useClientWallet';
import type { MerchantGrants } from '../hooks/useMerchantGrants';
import { PAGE_SIZE } from '../lib/filters';
import type { Client, StatementRow } from '../types';
import { JournalDialog } from './JournalDialog';

const NEWEST_FIRST: SortState = { field: 'createdAt', order: 'desc' };

/** Draws the wallet statement a page at a time, and owns the journal dialog. */
export function StatementTable({ client, grants }: { client: Pick<Client, 'id'>; grants: MerchantGrants }) {
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<SortState>(NEWEST_FIRST);
  const [journal, setJournal] = useState<StatementRow | null>(null);
  const ledgerLock = grants.needs('ledger:read');
  const statement = useClientStatement({
    clientId: client.id,
    page,
    pageSize: PAGE_SIZE,
    sort,
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

  const columns: DataTableColumn<StatementRow>[] = [
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
      <DataTable
        caption="Wallet ledger"
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
          <EmptyState icon="wallet" title="No wallet activity">
            Deposits, holds and adjustments appear here with a running balance.
          </EmptyState>
        }
      />
      {journal && <JournalDialog transactionId={journal.transactionId} onClose={() => setJournal(null)} />}
    </>
  );
}
