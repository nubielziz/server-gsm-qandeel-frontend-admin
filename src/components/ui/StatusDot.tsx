// StatusDot: the demo's small `.dot` (for example the red dot beside Orders when orders are past SLA).
import { cx } from './cx';
import type { BadgeTone } from './Badge';

export interface StatusDotProps {
  tone: BadgeTone;
  /** Spoken name of the state. Without it the dot is decorative (an adjacent word must carry the meaning). */
  label?: string;
  className?: string;
}

const DOT_CLASS: Record<BadgeTone, string> = {
  good: 'bg-good-dot',
  warn: 'bg-warn-dot',
  serious: 'bg-serious-dot',
  crit: 'bg-crit-dot',
  neutral: 'bg-neutral-dot',
  accent: 'bg-accent',
};

export function StatusDot({ tone, label, className }: StatusDotProps) {
  return (
    <span
      className={cx('dot', DOT_CLASS[tone], className)}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    />
  );
}
