// SupplierBanner: the red or orange strip at the top of an enabled supplier that is degraded or down, with how many open orders
// depend on it and the button that moves them. Ports the `banner` of supDetail in 44-p-suppliers.js; the button opens the
// reroute dialog (one target supplier) instead of moving every order to its fallback (MISMATCHES, MISMATCHES M62).
import { Button, cx, Icon } from '@/components/ui';
import { pct } from '@/lib/format';
import type { SupplierGrants } from '../hooks/useSupplierGrants';
import type { Supplier } from '../types';

export interface SupplierBannerProps {
  supplier: Supplier;
  grants: SupplierGrants;
  onReroute: () => void;
}

/** Shown for an enabled supplier that is degraded or down; its button opens the reroute dialog. */
export function SupplierBanner({ supplier, grants, onReroute }: SupplierBannerProps) {
  const down = supplier.health === 'down';
  const rate = supplier.successRate1h;
  const lock = grants.can('orders:update') && grants.can('orders:read') ? null : 'orders:update';
  return (
    <div
      className={cx(
        'flex flex-wrap items-start gap-3 border-b border-line px-3.5 py-2.5',
        down ? 'bg-crit-bg text-crit-fg' : 'bg-serious-bg text-serious-fg',
      )}
      role="alert"
    >
      <Icon name="alert" className="mt-0.5 flex-none" />
      <div className="min-w-[12rem] flex-1 text-sm">
        <p className="font-medium">
          {down
            ? `${supplier.name} is not responding`
            : rate === null
              ? 'Calls to this supplier are failing'
              : `Success rate fell to ${pct(rate, 0)} in the last hour`}
        </p>
        <p className="mt-0.5 text-xs">
          Orders that fail 3 times stop for manual review. {supplier.openOrders} open{' '}
          {supplier.openOrders === 1 ? 'order depends' : 'orders depend'} on this supplier.
        </p>
      </div>
      {supplier.openOrders > 0 && (
        <Button
          size="sm"
          variant="primary"
          className="flex-none"
          disabled={lock !== null}
          title={lock ? `You need the ${lock} permission` : undefined}
          onClick={onReroute}
        >
          <Icon name="refresh" className="ic-sm" />
          Reroute {supplier.openOrders} open {supplier.openOrders === 1 ? 'order' : 'orders'}…
        </Button>
      )}
    </div>
  );
}
