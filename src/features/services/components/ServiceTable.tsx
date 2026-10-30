// ServiceTable: the services table with the demo's columns (service and code, type, supplier and fallback, cost, price, margin,
// SLA, the Auto and Enabled switches, the menu). Ports `cols` of servicesTab in 43-p-services.js. It only draws what it is
// given: the figures (floor, margin, below floor) come from the server, and the page owns data, sort, page and selection.
import type { ReactNode } from 'react';
import {
  cx,
  DataTable,
  Icon,
  Switch,
  TypeTag,
  type DataTableColumn,
  type PaginationState,
  type RowSelection,
  type SortState,
} from '@/components/ui';
import { money, pct } from '@/lib/format';
import { slaText } from '../lib/sla';
import { TYPE_LABEL } from '../lib/status';
import type { Service } from '../types';
import { PriceCell } from './PriceCell';

export interface ServiceTableProps {
  rows: readonly Service[];
  state: 'loading' | 'error' | 'ready';
  error?: unknown;
  onRetry?: () => void;
  sort: SortState;
  onSortChange: (sort: SortState) => void;
  pagination: PaginationState;
  onPageChange: (page: number) => void;
  selection: RowSelection<number>;
  empty: ReactNode;
  /** Props for the switches and the price button when the staff member lacks `catalog:update`. */
  lock: { disabled: boolean; title?: string };
  /** The service whose switch is saving: only its switches wait. */
  busyId?: number;
  onToggleStatus: (service: Service, on: boolean) => void;
  onToggleAuto: (service: Service, on: boolean) => void;
  onEditPrice: (service: Service) => void;
  /** The "⋯" menu of a row. */
  menu: (service: Service) => ReactNode;
}

/** Draws the rows it is given, with the demo's columns. */
export function ServiceTable({
  rows,
  state,
  error,
  onRetry,
  sort,
  onSortChange,
  pagination,
  onPageChange,
  selection,
  empty,
  lock,
  busyId,
  onToggleStatus,
  onToggleAuto,
  onEditPrice,
  menu,
}: ServiceTableProps) {
  const columns: DataTableColumn<Service>[] = [
    {
      key: 'name',
      label: 'Service',
      sortField: 'name',
      render: (s) => (
        <>
          <span
            className={cx('block max-w-[300px] truncate font-medium', s.status === 'disabled' && 'text-ink3')}
          >
            {s.name}
          </span>
          <span className="mono text-xs text-ink3">{s.code}</span>
        </>
      ),
    },
    {
      key: 'type',
      label: 'Type',
      sortField: 'type',
      hide: 'md',
      render: (s) => <TypeTag>{TYPE_LABEL[s.type]}</TypeTag>,
    },
    {
      key: 'supplier',
      label: 'Supplier',
      hide: 'xl',
      render: (s) => (
        <>
          {s.supplier?.name ?? 'No supplier'}
          <p className="text-xs text-ink3">
            {s.fallbackSupplier ? `Fallback ${s.fallbackSupplier.name}` : 'No fallback'}
          </p>
        </>
      ),
    },
    {
      key: 'cost',
      label: 'Cost',
      num: true,
      sortField: 'cost',
      render: (s) => (
        <>
          {s.costChangedFrom && (
            <>
              <span className="text-warn-fg" title={`Supplier changed this from ${money(s.costChangedFrom)}`}>
                <Icon name="arrowUp" className="ic-xs inline" />
                <span className="sr-only">Supplier changed this from {money(s.costChangedFrom)}. </span>
              </span>{' '}
            </>
          )}
          {money(s.cost)}
        </>
      ),
    },
    {
      key: 'price',
      label: 'Price',
      num: true,
      sortField: 'basePrice',
      render: (s) => <PriceCell service={s} lock={lock} onEdit={onEditPrice} />,
    },
    {
      key: 'margin',
      label: 'Margin',
      num: true,
      hide: 'sm',
      // The amber tint for a thin margin is the demo's (below 5%); the margin itself is the server's figure.
      render: (s) => (
        <span className={Number(s.marginPct) < 5 ? 'font-medium text-warn-fg' : undefined}>
          {pct(s.marginPct, 1)}
        </span>
      ),
    },
    { key: 'sla', label: 'SLA', num: true, hide: 'lg', render: (s) => slaText(s.slaMinutes) },
    {
      key: 'auto',
      label: 'Auto',
      hide: 'md',
      render: (s) => (
        <Switch
          checked={s.executionMode === 'auto'}
          label={`Automation for ${s.name}`}
          disabled={lock.disabled || busyId === s.id}
          title={lock.title}
          onChange={(on) => onToggleAuto(s, on)}
        />
      ),
    },
    {
      key: 'enabled',
      label: 'Enabled',
      render: (s) => (
        <Switch
          checked={s.status === 'active'}
          label={`Enable ${s.name}`}
          disabled={lock.disabled || busyId === s.id}
          title={lock.title}
          onChange={(on) => onToggleStatus(s, on)}
        />
      ),
    },
    { key: 'more', label: '', className: 'w-10', render: menu },
  ];

  return (
    <DataTable
      caption="Services"
      columns={columns}
      rows={rows}
      rowKey={(s) => s.id}
      selection={selection}
      sort={sort}
      onSortChange={onSortChange}
      pagination={pagination}
      onPageChange={onPageChange}
      state={state}
      error={error}
      errorTitle="Could not load the services"
      onRetry={onRetry}
      empty={empty}
    />
  );
}
