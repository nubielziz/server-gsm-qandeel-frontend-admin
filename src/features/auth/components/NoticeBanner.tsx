// NoticeBanner: a tinted note inside a sign-in card, such as "Password updated" on the sign-in form.
import type { ReactNode } from 'react';
import { cx, Icon, type IconName } from '@/components/ui';

export type NoticeTone = 'crit' | 'warn' | 'good';

/** Tone tokens: each pair keeps at least 4.5:1 between text and tint in both themes. */
const TONE_CLASS: Record<NoticeTone, string> = {
  crit: 'bg-crit-bg text-crit-fg',
  warn: 'bg-warn-bg text-warn-fg',
  good: 'bg-good-bg text-good-fg',
};

export interface NoticeBannerProps {
  tone: NoticeTone;
  icon: IconName;
  title: string;
  /** `alert` is read out at once (errors); `status` waits for a pause (confirmations). */
  role?: 'alert' | 'status';
  children?: ReactNode;
}

/** A bold title and an optional line under it, with an icon so the tone never rests on colour alone. */
export function NoticeBanner({ tone, icon, title, role = 'alert', children }: NoticeBannerProps) {
  return (
    <div
      role={role}
      className={cx('flex items-start gap-2.5 rounded-lg px-3.5 py-3 text-sm', TONE_CLASS[tone])}
    >
      <Icon name={icon} className="mt-px flex-none" />
      <div className="min-w-0 flex-1">
        <p className="font-semibold">{title}</p>
        {children && <div className="mt-0.5">{children}</div>}
      </div>
    </div>
  );
}
