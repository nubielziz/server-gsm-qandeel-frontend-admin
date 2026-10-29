// Badge: the demo's badge(cls, icon, text) helper. Status is never colour alone, so it always carries a word.
import type { ReactNode } from 'react';
import { cx } from './cx';
import { Icon, type IconName } from './Icon';

export type BadgeTone = 'good' | 'warn' | 'serious' | 'crit' | 'neutral' | 'accent';

export interface BadgeProps {
  tone: BadgeTone;
  /** Pair every status with an icon (DESIGN.md "Status Is Not Decoration"). */
  icon?: IconName;
  /** The one solid fill of the system: critical severity in "Needs attention". Only valid with tone="crit". */
  solid?: boolean;
  /** The word that names the state. */
  children: ReactNode;
  className?: string;
}

// Full class names so Tailwind's scanner can see them. `accent` has no demo class, it uses the same tokens.
const TONE_CLASS: Record<BadgeTone, string> = {
  good: 'b-good',
  warn: 'b-warn',
  serious: 'b-serious',
  crit: 'b-crit',
  neutral: 'b-neutral',
  accent: 'bg-accent-soft text-accent-ink',
};

/** A 20px tinted badge: icon + word. */
export function Badge({ tone, icon, solid = false, children, className }: BadgeProps) {
  return (
    <span className={cx('badge', solid && tone === 'crit' ? 'b-crit-solid' : TONE_CLASS[tone], className)}>
      {icon && <Icon name={icon} className="ic-xs" />}
      <span>{children}</span>
    </span>
  );
}
