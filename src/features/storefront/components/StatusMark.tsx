// StatusMark: a status as the small square and its word (the list grammar of the Product / Services page: a green square for done or on, a
// hollow one for off or closed, amber for what waits for a person, red for what failed; never colour alone). It replaces the badge with an
// icon wherever a list, a run or a row says what state something is in. The square is hidden from assistive technology: the word says the same.
import type { ReactNode } from 'react';
import { cx, type BadgeTone, type SquareTone } from '@/components/ui';

// The square of each tone the words of this feature carry (`BadgeTone` is what `lib/` hands out).
const SQUARE_OF: Record<BadgeTone, SquareTone> = {
  good: 'ok',
  neutral: 'off',
  accent: 'warn',
  warn: 'warn',
  serious: 'warn',
  crit: 'crit',
};

const SQUARE_CLASS: Record<SquareTone, string> = {
  ok: 'status-sq-ok',
  off: 'status-sq-off',
  warn: 'status-sq-warn',
  crit: 'status-sq-crit',
};

/** The square of `tone`, then the word (`children`). */
export function StatusMark({ tone, children }: { tone: BadgeTone; children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span className={cx('status-sq', SQUARE_CLASS[SQUARE_OF[tone]])} aria-hidden="true" />
      <span>{children}</span>
    </span>
  );
}
