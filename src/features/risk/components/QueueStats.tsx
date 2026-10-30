// QueueStats: the strip of four figures above the held orders: how many are held and what they captured, the longest wait,
// the decisions of the last 30 days and the share of orders held. Ports the `strip` of `tabQueue` in 54-p-risk.js. The held
// count, the captured sum and the wait come from the held orders; the other two from the server's `stats` (a dash without them).
import { StatGrid, type StatCell } from '@/components/ui';
import { ageText, money0, pct } from '@/lib/format';
import { capturedTotal, LONG_WAIT_MS, longestWaitMs } from '../lib/queue';
import type { HeldOrder, QueueStats as Stats } from '../types';

export interface QueueStatsProps {
  held: readonly HeldOrder[];
  stats: Stats | undefined;
  now: number;
}

export function QueueStats({ held, stats, now }: QueueStatsProps) {
  const wait = longestWaitMs(held, now);
  const cells: StatCell[] = [
    {
      label: 'Held now',
      value: held.length,
      className: held.length > 0 ? 'text-warn-fg' : undefined,
      sub: held.length > 0 ? `${money0(capturedTotal(held))} captured, nothing sent` : 'Queue is clear',
    },
    {
      label: 'Longest wait',
      value: wait === null ? '–' : ageText(wait),
      className: wait !== null && wait > LONG_WAIT_MS ? 'text-crit-fg' : undefined,
      sub: 'Customers are told it can take up to an hour',
    },
    {
      label: 'Decided, 30 days',
      value: stats ? stats.decided30d : '–',
      sub: stats ? `${stats.approved30d} approved · ${stats.refunded30d} refunded` : undefined,
    },
    {
      label: 'Held of all orders',
      value: stats ? pct(stats.heldShare) : '–',
      sub: 'Aim for under 10%',
      tip: 'Every held order delays a real customer. If this climbs, lower the number of rules that add points or raise the hold threshold.',
    },
  ];
  return <StatGrid cells={cells} label="Risk queue figures" />;
}
