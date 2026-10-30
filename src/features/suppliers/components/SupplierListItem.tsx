// SupplierListItem: one supplier in the list on the left of the page: name and state, API type, open orders, success rate of
// the last hour and the prepaid balance. Ports one row of `supList` in 44-p-suppliers.js.
import { cx } from '@/components/ui';
import { money0, pct } from '@/lib/format';
import { driverLabel } from '../lib/connection';
import { belowTarget } from '../lib/metrics';
import type { Supplier } from '../types';
import { SupplierStatusBadge } from './SupplierStatusBadge';

export interface SupplierListItemProps {
  supplier: Supplier;
  selected: boolean;
  onSelect: (id: number) => void;
}

export function SupplierListItem({ supplier, selected, onSelect }: SupplierListItemProps) {
  const rate = supplier.successRate1h;
  return (
    <li>
      <button
        type="button"
        className={cx(
          'flex w-full items-start gap-3 px-3.5 py-3 text-start hover:bg-hover',
          selected && 'bg-accent/[.07]',
        )}
        aria-current={selected ? 'true' : undefined}
        onClick={() => onSelect(supplier.id)}
      >
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="text-sm font-medium">{supplier.name}</span>
            <SupplierStatusBadge supplier={supplier} />
          </span>
          <span className="mt-1 block text-xs text-ink3">
            {driverLabel(supplier.driver)} · {supplier.openOrders} open
            {supplier.reviewOrders > 0 && (
              <>
                , <span className="font-medium text-serious-fg">{supplier.reviewOrders} to review</span>
              </>
            )}
          </span>
        </span>
        <span className="flex-none text-end tabular-nums">
          <span className={cx('block text-sm font-medium', belowTarget(rate) && 'text-serious-fg')}>
            {rate === null ? '–' : pct(rate, 0)}
          </span>
          <span
            className={cx('block text-xs', supplier.lowBalance ? 'font-medium text-warn-fg' : 'text-ink3')}
          >
            {money0(supplier.balance)}
            {supplier.lowBalance && ' low'}
          </span>
        </span>
      </button>
    </li>
  );
}
