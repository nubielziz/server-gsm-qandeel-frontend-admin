// RiskBadge: a customer's risk level. A low risk is plain muted text; medium and high get a shield badge. `suffix` adds a word
// after the level ("Medium risk" in the page header). A level the console does not know shows its raw value in a neutral badge.
// Ports the risk cells of 48-p-customers.js and RISK_LABEL of 12-state-b2c.js.
import { Badge } from '@/components/ui';
import { riskBadge } from '../lib/status';
import type { RiskLevel } from '../types';

export function RiskBadge({ level, suffix = '' }: { level: RiskLevel; suffix?: string }) {
  const risk = riskBadge(level);
  if (level === 'low') return <span className="text-ink3">{risk.label}</span>;
  return (
    <Badge tone={risk.tone} icon="shield">
      {risk.label + suffix}
    </Badge>
  );
}
