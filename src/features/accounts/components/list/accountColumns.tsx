// The columns of the table of the All view, in the layout's order: [checkbox] Account | Rank | Status | Wallet | Spent 30 d |
// Orders | Last order | Actions. The checkbox column is the table's own (a `selection`). Wallet and Spent are drawn only for a role that may read
// wallets, because only then do the rows carry them. Every figure and every word is the server's; the console only formats.
import { ButtonLink, Icon, type DataTableColumn } from '@/components/ui';
import { ago, money0 } from '@/lib/format';
import { accountPath } from '../../lib/paths';
import type { AccountRow } from '../../types';
import type { AccountGrants } from '../frame/useAccountGrants';
import { accountLabel } from '../shared/accountLabel';
import { AccountStatus } from '../shared/AccountStatus';
import type { OpenAction } from '../types';
import { AccountCell, RankCell, WalletCell } from './AccountCells';
import { RowMenu } from './RowMenu';

const DASH = <span className="text-ink3">–</span>;

/** What the columns need from the view. */
export type AccountColumnsArgs = {
  grants: AccountGrants;
  /** The role may read wallets: the rows carry the wallet and the 30-day figures. */
  wallet: boolean;
  /** From `useNow`, so the ages move together and a test can fix them. */
  now: number;
  onAction: OpenAction;
};

/** The columns, in the order the table draws them. */
export function accountColumns({
  grants,
  wallet,
  now,
  onAction,
}: AccountColumnsArgs): DataTableColumn<AccountRow>[] {
  const columns: (DataTableColumn<AccountRow> | false)[] = [
    {
      key: 'name',
      label: 'Account',
      sortField: 'name',
      render: (account) => <AccountCell account={account} />,
    },
    { key: 'rank', label: 'Rank', sortField: 'rank', render: (account) => <RankCell account={account} /> },
    {
      key: 'status',
      label: 'Status',
      sortField: 'status',
      render: (account) => <AccountStatus account={account} />,
    },
    wallet && {
      key: 'wallet',
      label: 'Wallet',
      sortField: 'balance',
      num: true,
      render: (account) => <WalletCell account={account} />,
    },
    wallet && {
      key: 'spent',
      label: 'Spent 30 d',
      num: true,
      hide: 'sm',
      render: (account) => (account.stats && account.stats.orders > 0 ? money0(account.stats.spend) : DASH),
    },
    {
      key: 'orders',
      label: 'Orders',
      num: true,
      hide: 'md',
      sortField: 'ordersCount',
      render: (account) => account.ordersCount || DASH,
    },
    {
      key: 'last',
      label: 'Last order',
      hide: 'lg',
      sortField: 'lastOrderAt',
      render: (account) =>
        account.lastOrderAt ? ago(account.lastOrderAt, now) : <span className="text-ink3">Never</span>,
    },
    {
      key: 'actions',
      label: '',
      className: 'w-24 text-end',
      render: (account) => (
        <span className="inline-flex items-center justify-end gap-0.5">
          <ButtonLink
            to={accountPath(account.id)}
            variant="ghost"
            size="sm"
            icon
            aria-label={`Open ${accountLabel(account)}`}
            title="Open"
          >
            <Icon name="squarePen" className="ic-sm" />
          </ButtonLink>
          <RowMenu account={account} grants={grants} onAction={onAction} />
        </span>
      ),
    },
  ];
  return columns.filter((column): column is DataTableColumn<AccountRow> => column !== false);
}
