// RuleStatus: whether a pricing rule is on, as the small square and its word (the list grammar of the Product / Services page: a green square
// for on, a hollow one for off, never colour alone). The square is hidden from assistive technology: the word beside it says the same.
import { cx } from '@/components/ui';

/** "On" with a green square, or "Off" with a hollow one. */
export function RuleStatus({ on }: { on: boolean }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span className={cx('status-sq', on ? 'status-sq-ok' : 'status-sq-off')} aria-hidden="true" />
      {on ? 'On' : 'Off'}
    </span>
  );
}
