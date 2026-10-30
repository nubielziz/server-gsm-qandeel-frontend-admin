// TraceStepRow: one step of the price resolution: its number, label, whether it was used, applied, skipped or not set, its note and
// its figure. Ports one `<li>` of the steps in resolverTab (43-p-services.js): steps that decided the price carry the tint,
// skipped and unset steps recede. The server sent the step; the row only draws it.
import { cx, Icon } from '@/components/ui';
import { isLive, STEP_LOOK, stepAfterText, stepValueText } from '../lib/trace';
import type { PriceStep } from '../types';

/** One numbered step. */
export function TraceStepRow({ step, number }: { step: PriceStep; number: number }) {
  const look = STEP_LOOK[step.state];
  const live = isLive(step);
  const value = stepValueText(step);
  const after = stepAfterText(step);
  return (
    <li className={cx('flex items-start gap-3 px-3.5 py-2.5', live && 'bg-sunken')}>
      <span className="mono mt-0.5 w-4 flex-none text-ink3">{number}</span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2">
          <span className={cx('text-sm', live ? 'font-semibold' : 'font-medium text-ink3')}>
            {step.label}
          </span>
          <span className={cx('inline-flex items-center gap-1 text-xs', look.tone)}>
            <Icon name={look.icon} className="ic-xs" />
            {look.word}
          </span>
        </div>
        <p className="text-xs text-ink3">{step.note}</p>
      </div>
      <div className="text-end tabular-nums">
        <p className={cx('text-sm', live ? 'font-semibold' : 'font-medium')}>
          {step.state === 'skip' && value ? (
            <span className="font-normal text-ink3 line-through">{value}</span>
          ) : (
            value
          )}
        </p>
        {after && <p className="text-xs text-ink3">{after}</p>}
      </div>
    </li>
  );
}
