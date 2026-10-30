// CheckoutsTable: the abandoned checkouts table with the demo's columns (customer, service, basket, when, recovery) and the
// map's consent column and Remind button. Ports the `cols` of checkoutsBody in 51-p-checkouts.js. It only draws what it is given:
// the page owns the data, the sort, the page and the selection.
import type { ReactNode } from 'react';
import {
  Button,
  DataTable,
  Icon,
  type DataTableColumn,
  type PaginationState,
  type RowSelection,
  type SortState,
} from '@/components/ui';
import { ago, lm } from '@/lib/format';
import type { CheckoutGrants } from '../hooks/useCheckoutGrants';
import { utmSource } from '../lib/source';
import type { AbandonedCheckout } from '../types';
import { ConsentBadge } from './RecoveryBadge';
import { RecoveryCell } from './RecoveryCell';

export interface CheckoutsTableProps {
  rows: readonly AbandonedCheckout[];
  state: 'loading' | 'error' | 'ready';
  error?: unknown;
  onRetry?: () => void;
  /** From `useNow`, so the ages move together and a test can fix them. */
  now: number;
  grants: CheckoutGrants;
  sort: SortState;
  onSortChange: (sort: SortState) => void;
  pagination: PaginationState;
  onPageChange: (page: number) => void;
  selection: RowSelection<number>;
  /** True while a send is running: the Remind buttons wait. */
  sending: boolean;
  onRemind: (checkout: AbandonedCheckout) => void;
  empty: ReactNode;
}

export function CheckoutsTable({
  rows,
  state,
  error,
  onRetry,
  now,
  grants,
  sort,
  onSortChange,
  pagination,
  onPageChange,
  selection,
  sending,
  onRemind,
  empty,
}: CheckoutsTableProps) {
  const lock = grants.needs('growth:send');
  const columns: DataTableColumn<AbandonedCheckout>[] = [
    {
      key: 'customer',
      label: 'Customer',
      render: (checkout) => (
        <>
          {/* The server masks the address; masking again changes nothing and keeps a full address off the screen if one slips through. */}
          {/* The server sends the email already masked; it is shown as sent. */}
          <p className="font-medium">{checkout.email}</p>
          {utmSource(checkout) && <p className="text-2xs text-ink3">{utmSource(checkout)}</p>}
        </>
      ),
    },
    {
      key: 'service',
      label: 'Service',
      hide: 'md',
      render: (checkout) => <span className="text-ink2">{checkout.serviceName}</span>,
    },
    {
      key: 'basket',
      label: 'Basket',
      num: true,
      sortField: 'grossAmount',
      render: (checkout) => lm(checkout.grossAmount, checkout.currencyCode, checkout.fxRate),
    },
    {
      key: 'when',
      label: 'When',
      hide: 'sm',
      sortField: 'createdAt',
      render: (checkout) => <span className="text-ink2">{ago(checkout.createdAt, now)}</span>,
    },
    {
      key: 'consent',
      label: 'Marketing consent',
      render: (checkout) => <ConsentBadge agreed={checkout.marketingConsent} />,
    },
    {
      key: 'recovery',
      label: 'Recovery',
      sortField: 'recoveryEmailedAt',
      render: (checkout) => <RecoveryCell checkout={checkout} now={now} />,
    },
    {
      key: 'remind',
      label: '',
      className: 'w-px whitespace-nowrap',
      // Only a row the server says can be reminded has a button; the others say why in the Recovery column.
      render: (checkout) =>
        checkout.canRecover ? (
          <Button
            size="sm"
            disabled={lock.disabled || sending}
            title={lock.title}
            aria-label={`Send a reminder to ${checkout.email}`}
            onClick={() => onRemind(checkout)}
          >
            <Icon name="send" className="ic-sm" />
            Remind
          </Button>
        ) : null,
    },
  ];

  return (
    <DataTable
      caption="Abandoned checkouts"
      columns={columns}
      rows={rows}
      rowKey={(checkout) => checkout.id}
      selection={selection}
      sort={sort}
      onSortChange={onSortChange}
      pagination={pagination}
      onPageChange={onPageChange}
      state={state}
      error={error}
      errorTitle="Could not load the abandoned checkouts"
      onRetry={onRetry}
      empty={empty}
    />
  );
}
