// BlockedStats: the four figures above the blocked table (active blocks, added by the risk engine, requests refused,
// rules that cover the console). Ports the statGrid of tabIpBlock in 56-p-access.js.
import { StatGrid } from '@/components/ui';
import { num } from '@/lib/format';
import type { IpRule } from '../types';

/**
 * The four figures above the blocked table, worked out from all live blocks (not only the filtered ones).
 */
export function BlockedStats({ rules }: { rules: readonly IpRule[] }) {
  const temporary = rules.filter((rule) => rule.expiresAt).length;
  const automatic = rules.filter((rule) => rule.source === 'auto').length;
  const refused = rules.reduce((total, rule) => total + rule.hitCount, 0);
  const coveringConsole = rules.filter((rule) => rule.scope === 'admin' || rule.scope === 'all').length;
  return (
    <StatGrid
      label="Blocked IP figures"
      cells={[
        { label: 'Active blocks', value: rules.length, sub: `${temporary} temporary` },
        { label: 'Added by the risk engine', value: automatic, sub: 'Card testing, failed sign-ins' },
        { label: 'Requests refused', value: num(refused), sub: 'In the last 7 days' },
        { label: 'Covering the console', value: coveringConsole, sub: 'Rules that stop admin sign-ins' },
      ]}
    />
  );
}
