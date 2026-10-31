// MeasureValue: one measured number with its unit, a small state icon and an optional threshold line. No demo screen.
import { Icon, cx } from '@/components/ui';
import { formatMeasure, stateMeta, thresholdText, toneTextClass } from '../lib';
import type { Measure } from '../types';

export interface MeasureValueProps {
  measure: Measure;
  /** Adds the threshold the server applied under the value ("warn 800 ms"). */
  threshold?: boolean;
  className?: string;
}

/**
 * Prints the value as the server sent it: "412 ms", "0.42 %", "No data" for null. A warn, crit or unknown state adds a
 * small icon and a screen-reader word; an ok state adds nothing. It never compares the value with a threshold.
 */
export function MeasureValue({ measure, threshold = false, className }: MeasureValueProps) {
  const noData = measure.value === null;
  const meta = stateMeta(measure.state);
  // A null value has no state worth marking: "No data" already says it.
  const marked = !noData && measure.state !== 'ok';
  const line = threshold ? thresholdText(measure) : null;
  return (
    <span className={cx('inline-flex flex-col', className)}>
      <span className="inline-flex items-center gap-1 whitespace-nowrap tabular-nums">
        <span className={noData ? 'text-ink3' : undefined}>{formatMeasure(measure)}</span>
        {marked && (
          <>
            <Icon name={meta.icon} className={cx('ic-xs', toneTextClass(meta.tone))} />
            <span className="sr-only">{meta.word}</span>
          </>
        )}
      </span>
      {line && <span className="whitespace-nowrap text-xs text-ink3">{line}</span>}
    </span>
  );
}
