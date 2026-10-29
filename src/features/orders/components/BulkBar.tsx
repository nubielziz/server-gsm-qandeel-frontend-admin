// BulkBar: the strip above the table when rows are ticked. Ports bulkBar of 41-p-orders.js: how many are selected and what
// is at stake, then Complete…, Retry, Reroute, Reject… and Clear. Each button counts only the orders that offer that action
// (`orderActions`: no held or closed orders, no Retry for manual ones); while a run is going it shows a progress line.
import { Button, Icon, Menu, usePopover } from '@/components/ui';
import { money } from '@/lib/format';
import type { OrderGrants } from '../hooks/useOrderGrants';
import type { BulkProgress } from '../hooks/useBulkRun';
import { orderActions } from '../lib/actions';
import { atStake } from '../lib/money';
import { isOpen } from '../lib/status';
import type { Order, SupplierOption } from '../types';

export interface BulkBarProps {
  /** The ticked orders. */
  orders: readonly Order[];
  grants: OrderGrants;
  /** Suppliers to reroute to; empty when the staff member may not read suppliers. */
  suppliers: readonly SupplierOption[];
  progress: BulkProgress | null;
  onComplete: () => void;
  onRetry: () => void;
  onReroute: (supplier: SupplierOption) => void;
  onReject: () => void;
  onClear: () => void;
}

export function BulkBar({
  orders,
  grants,
  suppliers,
  progress,
  onComplete,
  onRetry,
  onReroute,
  onReject,
  onClear,
}: BulkBarProps) {
  const pop = usePopover();
  if (orders.length === 0) return null;
  const actions = orders.map(orderActions);
  // Complete and Reject apply to the same orders (open, not held by risk); Retry and Reroute skip manual orders too.
  const changeable = actions.filter((action) => action.complete).length;
  const sendable = actions.filter((action) => action.retry).length;
  const closed = orders.filter((order) => !isOpen(order)).length;
  const held = orders.length - changeable - closed;
  const lock = grants.needs('orders:update');
  const busy = lock.disabled || progress !== null;
  const none = changeable === 0 || busy;
  const noSend = sendable === 0 || busy;

  return (
    <div
      className="flex flex-wrap items-center gap-2 border-b border-line bg-accent-soft px-3.5 py-2"
      role="region"
      aria-label="Bulk actions"
    >
      <span className="text-sm font-medium text-accent-ink">{orders.length} selected</span>
      <span className="text-xs text-ink2">
        {changeable === orders.length
          ? `${money(atStake(orders))} at stake`
          : [
              `${changeable} can be changed`,
              closed > 0 && `${closed} already closed`,
              held > 0 && `${held} held by risk`,
            ]
              .filter(Boolean)
              .join(', ')}
      </span>
      <span className="flex-1" />
      {progress ? (
        <span className="text-sm text-ink2" role="status">
          {progress.verb} {progress.done} of {progress.total}…
        </span>
      ) : (
        <>
          <Button size="sm" disabled={none} title={lock.title} onClick={onComplete}>
            <Icon name="check" className="ic-sm" />
            Complete…
          </Button>
          <Button size="sm" disabled={noSend} title={lock.title} onClick={onRetry}>
            <Icon name="refresh" className="ic-sm" />
            Retry
          </Button>
          <Button
            ref={pop.anchorRef}
            size="sm"
            disabled={noSend || suppliers.length === 0}
            title={
              lock.title ??
              (suppliers.length === 0 ? 'No supplier to reroute to (needs suppliers:read)' : undefined)
            }
            aria-haspopup="menu"
            aria-expanded={pop.open}
            onClick={pop.toggle}
          >
            <Icon name="server" className="ic-sm" />
            Reroute
            <Icon name="chevD" className="ic-xs" />
          </Button>
          <Menu
            {...pop.panelProps}
            align="start"
            width={240}
            label="Reroute to"
            items={suppliers.map((supplier) => ({
              label: `${supplier.name}${supplier.status === 'degraded' || supplier.status === 'down' ? ` (${supplier.status})` : ''}`,
              icon: 'server' as const,
              disabled: supplier.status === 'down',
              run: () => onReroute(supplier),
            }))}
          />
          <Button size="sm" variant="danger" disabled={none} title={lock.title} onClick={onReject}>
            <Icon name="ban" className="ic-sm" />
            Reject…
          </Button>
        </>
      )}
      <Button size="sm" variant="ghost" disabled={progress !== null} onClick={onClear}>
        Clear
      </Button>
    </div>
  );
}
