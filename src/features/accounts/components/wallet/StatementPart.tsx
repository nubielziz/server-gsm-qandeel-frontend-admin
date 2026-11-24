// StatementPart: the "Statement" part of the record, a list: a Quick Search box with a day range, the wallet's ledger with a running balance
// for either wallet kind, the pinned footer pager, and the journal behind a line. The page, size, sort, range and wallet are the part's own state
// (the address of the record names the account and the part, nothing else). The Wallet menu reads the live wallet or the history of a wallet the
// account left behind by a rank change, and the official statement of a merchant wallet is one button away whenever one is shown. Every figure and
// word is the server's.
import { useState } from 'react';
import { EmptyState, FooterPager, RefreshTool, usePageClamp, type SortState } from '@/components/ui';
import { useAccountStatement } from '../../hooks/useAccountWallet';
import { DEFAULT_PAGE_SIZE } from '../../lib/paths';
import type { StatementRow, StatementWallet } from '../../types';
import type { AccountPartProps } from '../types';
import { JournalDialog } from './JournalDialog';
import { StatementSearch } from './StatementSearch';
import { StatementTable } from './StatementTable';
import { useStatementFile } from './useWalletWrites';
import { hasRange, NO_RANGE, statementRange, type DateRange } from './walletStatement';

const NEWEST_FIRST: SortState = { field: 'createdAt', order: 'desc' };

/**
 * One page of the statement at a time. Searching or sorting goes back to page 1; a statement that shrank under the page being shown goes back to
 * its last page. Needs `wallet:read` (the part's row) and `ledger:read` for the journals (the button says so when it is off).
 *
 * @param props.account the account whose wallet is shown.
 * @param props.grants what the staff member may do.
 * @see GET /admin/clients/:id/statement
 */
export function StatementPart({ account, grants }: AccountPartProps) {
  const [wallet, setWallet] = useState<StatementWallet>('live');
  const [draft, setDraft] = useState<DateRange>(NO_RANGE);
  const [range, setRange] = useState<DateRange>(NO_RANGE);
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(DEFAULT_PAGE_SIZE);
  const [sort, setSort] = useState<SortState>(NEWEST_FIRST);
  const [journal, setJournal] = useState<StatementRow | null>(null);

  const statement = useAccountStatement({
    accountId: account.id,
    page,
    pageSize: size,
    sort,
    range: statementRange(range),
    wallet,
    enabled: grants.can('wallet:read'),
  });
  const file = useStatementFile();
  // The official statement is the merchant wallet's: offered while that is the wallet shown (the live one of a merchant rank, or the one a
  // former merchant left behind). The server refuses it for an account that never held one.
  const merchantShown = wallet === 'merchant' || (wallet === 'live' && account.rank.kind === 'merchant');
  const rows = statement.data?.data ?? [];
  const total = statement.data?.total;
  usePageClamp({
    page,
    pageSize: size,
    total,
    settled: statement.isSuccess && !statement.isPlaceholderData,
    setPage,
  });

  return (
    <div className="view-frame">
      <div>
        <StatementSearch
          draft={draft}
          onDraft={setDraft}
          onSearch={() => {
            setRange(draft);
            setPage(1);
          }}
          wallet={wallet}
          onWallet={(next) => {
            setWallet(next);
            setPage(1);
          }}
          download={
            merchantShown
              ? {
                  onDownload: () => file.mutate(account),
                  busy: file.isPending,
                  lock: grants.needsAll('reports:read', 'wallet:read'),
                }
              : null
          }
        />
        <RefreshTool onRefresh={() => void statement.refetch()} busy={statement.isFetching} />
        <StatementTable
          rows={rows}
          state={statement.isLoading ? 'loading' : statement.isError ? 'error' : 'ready'}
          error={statement.error}
          onRetry={() => void statement.refetch()}
          sort={sort}
          onSort={(next) => {
            setSort(next);
            setPage(1);
          }}
          ledgerLock={grants.needs('ledger:read')}
          onJournal={setJournal}
          empty={
            hasRange(range) ? (
              <EmptyState icon="wallet" title="Nothing between these days">
                No money moved in this range. Change the days and search again.
              </EmptyState>
            ) : (
              <EmptyState icon="wallet" title="No money moved yet">
                Deposits, holds and adjustments appear here with a running balance.
              </EmptyState>
            )
          }
        />
        {journal && <JournalDialog transactionId={journal.transactionId} onClose={() => setJournal(null)} />}
      </div>
      <FooterPager
        page={page}
        pageSize={size}
        total={total ?? rows.length}
        onPage={setPage}
        onPageSize={(next) => {
          setSize(next);
          setPage(1);
        }}
      />
    </div>
  );
}
