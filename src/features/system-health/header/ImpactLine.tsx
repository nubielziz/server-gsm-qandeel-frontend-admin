// ImpactLine: the "Orders: 23 past SLA · $1,240.00 held · dispatch p95 4m 10s" line of the verdict: what the trouble costs in
// orders and money. It reads the order pipeline on its own, so when that read fails the verdict keeps its status and this
// line alone says "Order impact unavailable" (docs/system-health-design.md, "Layout").
import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { Button, Skeleton } from '@/components/ui';
import { money } from '@/lib/format';
import { ordersListPath } from '@/features/orders';
import { useHealthGrants, useOrdersHealth } from '../hooks';
import { formatMeasure } from '../lib';
import type { OrdersHealth } from '../types';
import { failureOf } from './failure';

/** One part of the line. It never breaks inside, so "dispatch p95" and its value stay together on a phone. */
function Part({ children }: { children: ReactNode }) {
  return <span className="whitespace-nowrap">{children}</span>;
}

/**
 * The sentence for an answer that arrived. A null count is "no data" and a zero is "none past SLA": never a made-up
 * number. Each separator dot starts the part after it, so a wrap never leaves a dot at a line end.
 */
function ImpactText({ orders }: { orders: OrdersHealth }) {
  const grants = useHealthGrants();
  const { stuck, dispatchP95 } = orders;
  const count = stuck.total.value;
  const pastSla = formatMeasure(stuck.total);

  let late: ReactNode;
  if (count === null) late = <Part>past SLA unknown</Part>;
  else if (count === 0) late = <Part>none past SLA</Part>;
  else {
    // The Orders page may not be readable for this staff member: then the count is plain text.
    const label = `${pastSla} past SLA`;
    late = (
      <>
        <Part>
          {grants.can('orders:read') ? (
            <Link className="link" to={ordersListPath({ pastSla: true })}>
              {label}
            </Link>
          ) : (
            label
          )}
        </Part>{' '}
        <Part>· {money(stuck.heldAmount)} held</Part>
      </>
    );
  }
  return (
    <p>
      <span className="font-medium">Orders:</span> {late}{' '}
      <Part>· dispatch p95 {dispatchP95.value === null ? 'unknown' : formatMeasure(dispatchP95)}</Part>
    </p>
  );
}

/** Loading shows one grey line; a failure says so in words, with the server's reason, the request id and a Retry. */
export function ImpactLine() {
  const orders = useOrdersHealth();
  if (orders.data) return <ImpactText orders={orders.data} />;
  if (orders.isPending) {
    return (
      <div role="status" aria-label="Loading order impact" className="py-1">
        <Skeleton width={260} height={12} />
      </div>
    );
  }
  const failure = failureOf(orders.error);
  return (
    <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
      <span className="font-medium">Order impact unavailable</span>
      <span className="text-ink2">{failure.detail ?? failure.title}</span>
      {failure.requestId && (
        <span className="text-xs text-ink3">
          Request <span className="mono">{failure.requestId}</span>
        </span>
      )}
      <Button size="sm" onClick={() => void orders.refetch()} loading={orders.isFetching}>
        Retry
      </Button>
    </p>
  );
}
