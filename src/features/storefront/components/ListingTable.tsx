// ListingTable: the listings table with the demo's columns (service and slug, B2B base, storefront price and floor, margin, orders,
// language, the "On the site" switch, the Price button). Ports `cols` of tabListings in 50-p-storefront.js. It only draws what it
// is given: the floor, margin and order figures come from the server, and the tab owns data, sort and page.
import type { ReactNode } from 'react';
import {
  Button,
  DataTable,
  Icon,
  Switch,
  type DataTableColumn,
  type PaginationState,
  type SortState,
} from '@/components/ui';
import { money0, num, pct, price } from '@/lib/format';
import { localeLabel } from '../lib/kinds';
import type { ServiceListing } from '../types';

export interface ListingTableProps {
  rows: readonly ServiceListing[];
  state: 'loading' | 'error' | 'ready';
  error?: unknown;
  onRetry?: () => void;
  sort: SortState;
  onSortChange: (sort: SortState) => void;
  pagination: PaginationState;
  onPageChange: (page: number) => void;
  empty: ReactNode;
  /** Props for the switch and the Price button when the staff member lacks `storefront:update`. */
  lock: { disabled: boolean; title?: string };
  /** The listing whose switch is saving: only its switch waits. */
  busyId?: number;
  onToggle: (listing: ServiceListing, on: boolean) => void;
  onEditPrice: (listing: ServiceListing) => void;
}

// The amber tint for a thin margin is the demo's (below 15%); the margin itself is the server's figure.
const THIN_MARGIN_PCT = 15;

/** Draws the rows it is given, with the demo's columns. */
export function ListingTable({
  rows,
  state,
  error,
  onRetry,
  sort,
  onSortChange,
  pagination,
  onPageChange,
  empty,
  lock,
  busyId,
  onToggle,
  onEditPrice,
}: ListingTableProps) {
  const columns: DataTableColumn<ServiceListing>[] = [
    {
      key: 'name',
      label: 'Service',
      sortField: 'publicTitle',
      render: (l) => (
        <>
          <p className="font-medium">{l.publicTitle}</p>
          <p className="mono text-2xs text-ink3">
            {l.service.code} · /{l.slug}
          </p>
        </>
      ),
    },
    {
      key: 'base',
      label: 'B2B base',
      num: true,
      hide: 'md',
      render: (l) => <span className="text-ink2">{price(l.service.basePrice)}</span>,
    },
    {
      key: 'retail',
      label: 'Storefront price',
      num: true,
      render: (l) => (
        <>
          {l.retailPrice ? (
            <span className="font-medium">{price(l.retailPrice)}</span>
          ) : (
            <span className="text-ink3">–</span>
          )}
          <p className="text-2xs text-ink3">Floor {price(l.floorPrice)}</p>
        </>
      ),
    },
    {
      key: 'margin',
      label: 'Margin',
      num: true,
      hide: 'lg',
      render: (l) =>
        l.retailPrice && l.marginPct !== null ? (
          <span
            className={Number(l.marginPct) < THIN_MARGIN_PCT ? 'tabular-nums text-warn-fg' : 'tabular-nums'}
          >
            {pct(l.marginPct)}
          </span>
        ) : (
          '–'
        ),
    },
    {
      key: 'orders',
      label: 'Orders, 30 days',
      num: true,
      hide: 'sm',
      render: (l) =>
        l.orders30d ? (
          <>
            {num(l.orders30d)}
            <p className="text-2xs text-ink3">{money0(l.revenue30d)}</p>
          </>
        ) : (
          <span className="text-ink3">0</span>
        ),
    },
    {
      key: 'language',
      label: 'Language',
      hide: 'xl',
      render: (l) => <span className="text-ink2">{localeLabel(l.locale)}</span>,
    },
    {
      key: 'listed',
      label: 'On the site',
      sortField: 'isListed',
      render: (l) =>
        l.locked ? (
          <span className="inline-flex items-center gap-1.5 text-xs text-ink3">
            <Icon name="lock" className="ic-xs" />
            {l.lockedReason}
          </span>
        ) : (
          <Switch
            checked={l.isListed}
            label={`Show ${l.publicTitle} on the storefront`}
            disabled={lock.disabled || busyId === l.id}
            title={lock.title}
            onChange={(on) => onToggle(l, on)}
          />
        ),
    },
    {
      key: 'actions',
      label: '',
      render: (l) =>
        l.locked ? null : (
          <Button
            size="sm"
            disabled={lock.disabled}
            title={lock.title}
            aria-label={`Edit the storefront price of ${l.publicTitle}`}
            onClick={() => onEditPrice(l)}
          >
            <Icon name="edit" className="ic-xs" />
            Price
          </Button>
        ),
    },
  ];

  return (
    <DataTable
      caption="Storefront listings"
      columns={columns}
      rows={rows}
      rowKey={(l) => l.id}
      sort={sort}
      onSortChange={onSortChange}
      pagination={pagination}
      onPageChange={onPageChange}
      state={state}
      error={error}
      errorTitle="Could not load the listings"
      onRetry={onRetry}
      empty={empty}
    />
  );
}
