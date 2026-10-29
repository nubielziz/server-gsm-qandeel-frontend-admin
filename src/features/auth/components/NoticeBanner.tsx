// NoticeBanner: a tinted message box with an icon and a title, for the sign-in screens (reasons, errors, confirmations).
// Status is never colour alone: the icon and the title carry the meaning too (DESIGN.md).
import type { ReactNode } from 'react';
import { cx, Icon, type IconName } from '@/components/ui';

export type NoticeTone = 'crit' | 'warn' | 'good';

// Full class names so Tailwind's scanner sees them; the token pairs are the demo's badge colours.
const TONE_CLASS: Record<NoticeTone, string> = {
  crit: 'bg-crit-bg text-crit-fg',
  warn: 'bg-warn-bg text-warn-fg',
  good: 'bg-good-bg text-good-fg',
};

export interface NoticeBannerProps {
  tone: NoticeTone;
  icon: IconName;
  title: string;
  /** `alert` is read out at once (errors, blocked sign-in); `status` waits for a pause (confirmations). */
  role?: 'alert' | 'status';
  children?: ReactNode;
}

export function NoticeBanner({ tone, icon, title, role = 'alert', children }: NoticeBannerProps) {
  return (
    <div
      role={role}
      className={cx('flex items-start gap-2.5 rounded-md px-3 py-2.5 text-sm', TONE_CLASS[tone])}
    >
      <Icon name={icon} className="mt-px" />
      <div className="min-w-0 flex-1">
        <p className="font-medium">{title}</p>
        {children && <div className="mt-0.5 text-xs">{children}</div>}
      </div>
    </div>
  );
}
