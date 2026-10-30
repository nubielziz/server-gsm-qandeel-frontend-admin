// RecentDecisions: "Decided recently", the last held orders a person approved or refunded, with who decided and when. Ports
// the `hist` panel of `tabQueue` in 54-p-risk.js. Left out when the server sends none.
import { Badge, Panel, ScoreMeter } from '@/components/ui';
import { ago, lm } from '@/lib/format';
import type { DecidedOrder } from '../types';
import { OrderLink } from './OrderLink';

export function RecentDecisions({ rows, now }: { rows: readonly DecidedOrder[] | undefined; now: number }) {
  if (!rows || rows.length === 0) return null;
  return (
    <Panel title="Decided recently" flush className="mt-4">
      <ul className="m-0 list-none divide-y divide-line p-0">
        {rows.map((row) => (
          <li key={row.orderId} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3.5 py-2.5 text-sm">
            <span className="w-20 flex-none">
              <OrderLink id={row.orderId} />
            </span>
            <span className="min-w-0 flex-1 truncate text-ink2">
              {row.customer.name} · {lm(row.capturedAmount, row.currency, row.fxRate)}
            </span>
            <ScoreMeter score={row.score} />
            {row.outcome === 'approved' ? (
              <Badge tone="good" icon="checkCircle">
                Approved
              </Badge>
            ) : (
              <Badge tone="neutral" icon="undo">
                Refunded
              </Badge>
            )}
            <span className="w-24 flex-none text-end text-xs text-ink3">
              {row.reviewedBy ? `${row.reviewedBy.name}, ` : ''}
              {ago(row.reviewedAt, now)}
            </span>
          </li>
        ))}
      </ul>
    </Panel>
  );
}
