// CustomerTable: the customers table with the demo's columns (customer, country, account, orders, spent, last order, risk,
// status). Ports `cols` of pageCustomers in 48-p-customers.js. It only draws what it is given: the page owns the data, the
// sort and the page, and the server sorts.
import type { ReactNode } from 'react';
import { Link } from 'react-router';
import {
  DataTable,
  TypeTag,
  type DataTableColumn,
  type PaginationState,
  type SortState,
} from '@/components/ui';
import { ago, money } from '@/lib/format';
import { customerPath } from '../lib/detailTabs';
import { isZeroMoney } from '../lib/text';
import type { Customer } from '../types';
import { CustomerStatusBadge } from './CustomerStatusBadge';
import { RiskBadge } from './RiskBadge';

export interface CustomerTableProps {
  rows: readonly Customer[];
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

const dash = <span className="text-ink3">–</span>;

export function CustomerTable({
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
}: CustomerTableProps) {
  const columns: DataTableColumn<Customer>[] = [
    {
      key: 'name',
      label: 'Customer',
      sortField: 'name',
      render: (customer) => (
        <>
          <Link className="link font-medium" to={customerPath(customer.id)}>
            {customer.name}
          </Link>
          <p className="text-2xs text-ink3">
            {customer.status === 'anonymized' ? 'Removed' : customer.email}
          </p>
        </>
      ),
    },
    {
      key: 'country',
      label: 'Country',
      hide: 'md',
      sortField: 'country',
      render: (customer) => (
        <>
          <span className="mono">{customer.country}</span>{' '}
          {customer.currencyCode && <span className="text-ink3">{customer.currencyCode}</span>}
        </>
      ),
    },
    {
      key: 'account',
      label: 'Account',
      hide: 'lg',
      sortField: 'hasAccount',
      render: (customer) => <TypeTag>{customer.hasAccount ? 'Account' : 'Guest'}</TypeTag>,
    },
    {
      key: 'orders',
      label: 'Orders',
      num: true,
      sortField: 'ordersCount',
      render: (customer) => customer.ordersCount || dash,
    },
    {
      key: 'spent',
      label: 'Spent',
      num: true,
      sortField: 'totalSpent',
      render: (customer) => (isZeroMoney(customer.totalSpent) ? dash : money(customer.totalSpent)),
    },
    {
      key: 'last',
      label: 'Last order',
      hide: 'sm',
      sortField: 'lastOrderAt',
      render: (customer) =>
        customer.lastOrderAt ? ago(customer.lastOrderAt, now) : <span className="text-ink3">Never</span>,
    },
    {
      key: 'risk',
      label: 'Risk',
      hide: 'md',
      sortField: 'riskLevel',
      render: (customer) => <RiskBadge level={customer.riskLevel} />,
    },
    {
      key: 'status',
      label: 'Status',
      sortField: 'status',
      render: (customer) => <CustomerStatusBadge status={customer.status} />,
    },
  ];

  return (
    <DataTable
      caption="Customers"
      columns={columns}
      rows={rows}
      rowKey={(customer) => customer.id}
      sort={sort}
      onSortChange={onSortChange}
      pagination={pagination}
      onPageChange={onPageChange}
      state={state}
      error={error}
      errorTitle="Could not load the customers"
      onRetry={onRetry}
      empty={empty}
    />
  );
}
