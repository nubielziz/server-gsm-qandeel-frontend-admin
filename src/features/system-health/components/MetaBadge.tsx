// MetaBadge: a badge for any word, tone and icon from lib/status.ts that is not a health status: alert and incident
// severity and status, a supplier's circuit state, a job run, an integrity result. No demo screen.
import { Badge } from '@/components/ui';
import type { StatusMeta } from '../lib';

export interface MetaBadgeProps {
  /** For example `alertStatusMeta(alert.status)` or `circuitMeta(supplier.circuit)`. */
  meta: StatusMeta;
  className?: string;
}

/** `HealthBadge` takes a health status; this takes the ready-made meta. A hint (circuit states) becomes the tooltip. */
export function MetaBadge({ meta, className }: MetaBadgeProps) {
  const badge = (
    <Badge tone={meta.tone} icon={meta.icon} className={className}>
      {meta.word}
    </Badge>
  );
  return meta.hint ? <span title={meta.hint}>{badge}</span> : badge;
}
