// MerchantTable: the merchants table with the demo's columns (merchant, group, status, wallet, spend, orders, success, last order,
// Approve). Ports the `cols` of pageMerchants in 42-p-merchants.js. It only draws what it is given: the page owns the data, the
// sort and the page. The wallet and 30-day figures come with the rows when the server sends them; a dash shows where they are missing.
import type { ReactNode } from 'react';
import { Link } from 'react-router';
import {
  Button,
  DataTable,
  Icon,
  TypeTag,
  type DataTableColumn,
  type PaginationState,
  type SortState,
} from '@/components/ui';
import { ago, money, money0, pct, toAmount } from '@/lib/format';
import type { MerchantGrants } from '../hooks/useMerchantGrants';
import { merchantPath } from '../lib/paths';
import type { Client } from '../types';
import { MerchantStatusBadge } from './MerchantStatusBadge';

export interface MerchantTableProps {
  rows: readonly Client[];
  state: 'loading' | 'error' | 'ready';
  error?: unknown;
  onRetry?: () => void;
  /** From `useNow`, so the ages move together and a test can fix them. */
  now: number;
  sort?: SortState;
  onSortChange?: (sort: SortState) => void;
  pagination?: PaginationState;
  onPageChange?: (page: number) => void;
  grants: MerchantGrants;
  /** The id of the merchant being approved, so only that button shows its spinner. */
  approving?: number | null;
  onApprove: (client: Client) => void;
  empty?: ReactNode;
}

const DASH = <span className="text-ink3">–</span>;

// The wallet balance, red with an alert when it is below zero, and what is held for open orders under it.
function WalletCell({ client }: { client: Client }) {
  const wallet = client.wallet;
  if (!wallet) return DASH;
  const negative = toAmount(wallet.balance) < 0;
  return (
    <>
      <span className={negative ? 'font-medium text-crit-fg' : undefined}>
        {negative && <Icon name="alert" className="ic-xs me-1 inline" />}
        {money(wallet.balance)}
      </span>
      {toAmount(wallet.reserved) > 0.005 && (
        <p className="text-2xs text-ink3">{money0(wallet.reserved)} held</p>
      )}
    </>
  );
}

/** Draws the merchants table; the page owns the data, the sort and the page. */
export function MerchantTable({
  rows,
  state,
  error,
  onRetry,
  now,
  sort,
  onSortChange,
  pagination,
  onPageChange,
  grants,
  approving,
  onApprove,
  empty,
}: MerchantTableProps) {
  const approveLock = grants.needs('clients:update');
  const columns: DataTableColumn<Client>[] = [
    {
      key: 'name',
      label: 'Merchant',
      sortField: 'name',
      render: (client) => (
        <>
          <Link className="link font-medium" to={merchantPath(client.id)}>
            {client.name}
          </Link>
          <p className="max-w-[320px] truncate text-2xs text-ink3">
            <span className="mono">{client.country}</span> · {client.email}
          </p>
        </>
      ),
    },
    {
      key: 'group',
      label: 'Group',
      hide: 'md',
      render: (client) => (client.group ? <TypeTag>{client.group.name}</TypeTag> : DASH),
    },
    {
      key: 'status',
      label: 'Status',
      sortField: 'status',
      render: (client) => <MerchantStatusBadge status={client.status} />,
    },
    { key: 'wallet', label: 'Wallet', num: true, render: (client) => <WalletCell client={client} /> },
    {
      key: 'spend',
      label: 'Spend 30D',
      num: true,
      hide: 'sm',
      render: (client) => (client.stats?.orders ? money0(client.stats.spend) : DASH),
    },
    {
      key: 'orders',
      label: 'Orders',
      num: true,
      hide: 'lg',
      render: (client) => client.stats?.orders || DASH,
    },
    {
      key: 'success',
      label: 'Success',
      num: true,
      hide: 'xl',
      render: (client) => (client.stats?.successRate == null ? DASH : pct(client.stats.successRate, 0)),
    },
    {
      key: 'seen',
      label: 'Last order',
      hide: 'lg',
      render: (client) => {
        if (!client.stats) return DASH;
        return client.stats.lastOrderAt ? (
          ago(client.stats.lastOrderAt, now)
        ) : (
          <span className="text-ink3">Never</span>
        );
      },
    },
    {
      key: 'act',
      label: '',
      className: 'w-24',
      render: (client) =>
        client.status === 'pending' ? (
          <Button
            size="sm"
            aria-label={`Approve ${client.name}`}
            disabled={approveLock.disabled}
            title={approveLock.title}
            loading={approving === client.id}
            onClick={() => onApprove(client)}
          >
            Approve
          </Button>
        ) : null,
    },
  ];

  return (
    <DataTable
      caption="Merchants"
      columns={columns}
      rows={rows}
      rowKey={(client) => client.id}
      sort={sort}
      onSortChange={onSortChange}
      pagination={pagination}
      onPageChange={onPageChange}
      state={state}
      error={error}
      errorTitle="Could not load the merchants"
      onRetry={onRetry}
      empty={empty}
    />
  );
}
