// HeldByRisk: the last part of the Order pipeline card: paid storefront orders the risk rules are holding (count, money,
// age of the oldest) with a link to the review queue. Orders & suppliers tab, `GET /admin/system/orders-health`.
import { useId } from 'react';
import { Link } from 'react-router';
import { ageText, money, useNow } from '@/lib/format';
import { useHealthGrants } from '../../hooks';
import type { OrdersHealth } from '../../types';
import { RISK_QUEUE_PATH } from './links';
import { ordersCount } from './pipelineModel';

/** The age of the oldest held order, or null when the server sent no time or one that cannot be read. */
function oldestAge(oldestAt: string | null, now: number): string | null {
  const start = oldestAt ? Date.parse(oldestAt) : Number.NaN;
  return Number.isNaN(start) ? null : ageText(now - start);
}

/**
 * "3 orders · $145.00 · oldest 1h 35m". Zero held orders say so in words and have no link, because the queue is empty. The
 * link is only drawn for a staff member who may open the Risk page (`risk:read`).
 */
export function HeldByRisk({ held }: { held: OrdersHealth['heldByRisk'] }) {
  const grants = useHealthGrants();
  const now = useNow(30_000);
  const titleId = useId();
  const age = oldestAge(held.oldestAt, now);
  return (
    <section
      aria-labelledby={titleId}
      className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-t border-line px-3.5 py-3"
    >
      <div className="min-w-0">
        <h3 id={titleId} className="text-xs font-medium text-ink2">
          Held by risk
        </h3>
        <p className="mt-0.5 text-sm">
          {held.count === 0 ? (
            'No orders are held by the risk rules.'
          ) : (
            <span className="tabular-nums">
              {ordersCount(held.count)} · {money(held.amount)}
              {age && ` · oldest ${age}`}
            </span>
          )}
        </p>
      </div>
      {held.count > 0 && grants.can('risk:read') && (
        <Link className="link text-sm" to={RISK_QUEUE_PATH}>
          Open the review queue
        </Link>
      )}
    </section>
  );
}
