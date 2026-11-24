// PriceTable: the fixed prices of one account in the list skin: the service (its kind in small italics), the base price, the rank price the
// account would pay without it, the fixed price (bold, its note under it), the floor, and the edit and remove icons. Every figure is the
// server's, formatted only. A fixed price beats every other rule for this account.
import type { ReactNode } from 'react';
import { Button, DataTable, Icon, type DataTableColumn } from '@/components/ui';
import { money } from '@/lib/format';
import type { AccountPrice } from '../../types';
import type { GrantLock } from '../frame/useAccountGrants';
import { kindWord } from './priceWords';

export interface PriceTableProps {
  /** The fixed prices of the page being shown. */
  rows: readonly AccountPrice[];
  state: 'loading' | 'error' | 'ready';
  error?: unknown;
  onRetry: () => void;
  /** Drawn when the account has no fixed price. */
  empty: ReactNode;
  updateLock: GrantLock;
  deleteLock: GrantLock;
  onEdit: (price: AccountPrice) => void;
  onRemove: (price: AccountPrice) => void;
}

const DASH = <span className="text-ink3">–</span>;

/** The table of fixed prices. The footer pager under it is the part's. */
export function PriceTable({
  rows,
  state,
  error,
  onRetry,
  empty,
  updateLock,
  deleteLock,
  onEdit,
  onRemove,
}: PriceTableProps) {
  const columns: DataTableColumn<AccountPrice>[] = [
    {
      key: 'service',
      label: 'Service',
      render: (row) => (
        <>
          <span className="font-medium">{row.service.name}</span>
          {row.service.type && <span className="cell-sub">{kindWord(row.service.type)}</span>}
        </>
      ),
    },
    {
      key: 'base',
      label: 'Base',
      num: true,
      hide: 'sm',
      render: (row) => (row.service.basePrice ? money(row.service.basePrice) : DASH),
    },
    {
      key: 'rank',
      label: 'Rank price',
      num: true,
      render: (row) => (row.groupPrice ? money(row.groupPrice) : DASH),
    },
    {
      key: 'fixed',
      label: 'Fixed price',
      num: true,
      render: (row) => (
        <>
          <span className="font-semibold">{money(row.price)}</span>
          {row.note && <span className="cell-sub">{row.note}</span>}
        </>
      ),
    },
    {
      key: 'floor',
      label: 'Floor',
      num: true,
      hide: 'md',
      render: (row) =>
        row.service.floorPrice ? <span className="text-ink3">{money(row.service.floorPrice)}</span> : DASH,
    },
    {
      key: 'actions',
      label: '',
      className: 'w-20 text-end',
      render: (row) => (
        <span className="inline-flex items-center justify-end gap-0.5">
          <Button
            variant="ghost"
            size="sm"
            icon
            aria-label={`Edit the fixed price of ${row.service.name}`}
            disabled={updateLock.disabled}
            title={updateLock.title ?? 'Edit'}
            onClick={() => onEdit(row)}
          >
            <Icon name="squarePen" className="ic-sm" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            icon
            aria-label={`Remove the fixed price of ${row.service.name}`}
            disabled={deleteLock.disabled}
            title={deleteLock.title ?? 'Remove'}
            onClick={() => onRemove(row)}
          >
            <Icon name="x" className="ic-sm" />
          </Button>
        </span>
      ),
    },
  ];

  return (
    <DataTable
      skin="list"
      footer={false}
      caption="Fixed prices"
      columns={columns}
      rows={rows}
      rowKey={(row) => row.id}
      state={state}
      error={error}
      errorTitle="Could not load the fixed prices"
      onRetry={onRetry}
      empty={empty}
    />
  );
}
