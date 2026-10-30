// ChecksStats: the strip of figures above the IMEI check table. The demo showed checks in 30 days, the share that became an
// order, blacklisted phones found and the lookup cost; the last two need sums over every check, which the list route does not
// give, so the strip shows the counts it can ask the server for (all, free checker, before an order, blacklisted found).
import { StatGrid, type StatCell } from '@/components/ui';
import { num, pct } from '@/lib/format';
import { useImeiCounts } from '../hooks/useImeiChecks';

const show = (value: number | undefined) => (value === undefined ? '–' : num(value));

export function ChecksStats() {
  const counts = useImeiCounts();
  const { all, blacklisted } = counts;
  const cells: StatCell[] = [
    { label: 'Checks', value: show(all), sub: 'Free checker and pre-order checks' },
    { label: 'Free checker', value: show(counts.free), sub: 'From the public IMEI checker' },
    { label: 'Before an order', value: show(counts.preOrder), sub: 'Checked while ordering' },
    {
      label: 'Blacklisted found',
      value: show(blacklisted),
      sub:
        all && blacklisted !== undefined
          ? `${pct((blacklisted / all) * 100)} of checks · saved from a bad sale`
          : undefined,
      tip: 'These people were told before paying that nothing can unlock their phone. No order, no refund, no support ticket.',
    },
  ];
  return <StatGrid cells={cells} label="IMEI check figures" />;
}
