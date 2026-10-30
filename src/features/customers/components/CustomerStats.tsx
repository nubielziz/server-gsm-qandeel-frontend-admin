// CustomerStats: the five figures above the detail tabs (orders, lifetime spend, refunds, tickets, disputes). Ports the `strip` of
// pageCustomer in 48-p-customers.js. The figures come from the server; the average and the refund share are display maths only.
import { StatGrid } from '@/components/ui';
import { ago, money, num, pct, toAmount } from '@/lib/format';
import type { CustomerStats as Stats } from '../types';

export function CustomerStats({ stats, now }: { stats: Stats; now: number }) {
  const average = stats.orders > 0 ? toAmount(stats.spent) / stats.orders : 0;
  return (
    <StatGrid
      label="Customer figures"
      cells={[
        {
          label: 'Orders',
          value: num(stats.orders),
          sub: stats.lastOrderAt ? `Last ${ago(stats.lastOrderAt, now)}` : 'No orders yet',
        },
        {
          label: 'Lifetime spend',
          value: money(stats.spent),
          sub: stats.orders ? `Average ${money(average)}` : undefined,
        },
        {
          label: 'Refunds',
          value: stats.refunds,
          sub: stats.orders ? `${pct((stats.refunds / stats.orders) * 100, 0)} of orders` : undefined,
        },
        { label: 'Support tickets', value: stats.tickets },
        { label: 'Disputes', value: stats.disputes, className: stats.disputes ? 'text-crit-fg' : undefined },
      ]}
    />
  );
}
