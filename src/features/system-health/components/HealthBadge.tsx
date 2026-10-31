// HealthBadge: the status of anything on the System health page as a badge (tone + icon + word). No demo screen.
import { Badge } from '@/components/ui';
import { statusMeta, type HealthStatus } from '../lib';

export interface HealthBadgeProps {
  /** An overall status, a component check, a measure's state or `paused`. */
  status: HealthStatus;
  /** Replaces the word when the page knows better ("Monitoring unavailable" for an unknown status). */
  label?: string;
  className?: string;
}

/** Status is never colour alone: the badge always carries an icon and a word. Unknown and missing data stay neutral. */
export function HealthBadge({ status, label, className }: HealthBadgeProps) {
  const meta = statusMeta(status);
  return (
    <Badge tone={meta.tone} icon={meta.icon} className={className}>
      {label ?? meta.word}
    </Badge>
  );
}
