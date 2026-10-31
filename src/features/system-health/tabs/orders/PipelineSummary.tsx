// PipelineSummary: the four figures at the top of the Order pipeline card: orders past SLA, the money they hold, dispatch
// p95 and the orders waiting for staff. Orders & suppliers tab, `GET /admin/system/orders-health`.
import { useId, type ReactNode } from 'react';
import { money, num } from '@/lib/format';
import { MeasureValue } from '../../components';
import { thresholdText } from '../../lib';
import type { OrdersHealth } from '../../types';

interface FigureProps {
  label: string;
  /** What the figure means, as a tooltip on its label. */
  meaning?: string;
  /** The small line under the value: the server's threshold, or what the number counts. */
  hint?: string | null;
  children: ReactNode;
}

/** One cell of the strip. It is a named group, so a screen reader hears "Orders past SLA" before the value. */
function Figure({ label, meaning, hint, children }: FigureProps) {
  const labelId = useId();
  return (
    <div role="group" aria-labelledby={labelId} className="min-w-0 bg-surface p-3 sm:p-3.5">
      <p id={labelId} title={meaning} className="text-xs text-ink3">
        {label}
      </p>
      <div className="mt-1 text-xl font-semibold tracking-tight">{children}</div>
      {hint && <p className="mt-1 text-xs text-ink3">{hint}</p>}
    </div>
  );
}

/**
 * The hairlines between the cells are the 1px gaps of a grid on the line colour (as in the key figures row): two columns on
 * a phone, four from `lg`. The state icons and the threshold text come from the server; nothing is compared here.
 */
export function PipelineSummary({ orders }: { orders: OrdersHealth }) {
  const { stuck, dispatchP95, needsAttention } = orders;
  return (
    <div className="grid grid-cols-2 gap-px border-b border-line bg-line lg:grid-cols-4">
      <Figure label="Orders past SLA" hint={thresholdText(stuck.total)}>
        <MeasureValue measure={stuck.total} />
      </Figure>
      <Figure label="Money held" hint="by orders past SLA">
        <span className="tabular-nums">{money(stuck.heldAmount)}</span>
      </Figure>
      <Figure
        label="Dispatch p95"
        meaning="Time from accepted to sent to the supplier, 95th percentile"
        hint={thresholdText(dispatchP95) ?? 'accepted to sent'}
      >
        <MeasureValue measure={dispatchP95} />
      </Figure>
      <Figure label="Needs attention" hint="orders waiting for staff">
        <span className="tabular-nums">{num(needsAttention)}</span>
      </Figure>
    </div>
  );
}
