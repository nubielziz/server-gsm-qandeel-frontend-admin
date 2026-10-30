// Delta: the change mark under a key figure ("up 12.3%", "No change", "No earlier data"). Draws what lib/delta.ts worked out;
// ports the markup of delta() in 40-p-dashboard.js.
import { cx, Icon } from '@/components/ui';
import type { Delta as DeltaResult } from '../lib/delta';

/** Better is green and worse is red, and the words "better" or "worse" are read out too: colour is never the only signal. */
export function Delta({ change }: { change: DeltaResult }) {
  if (change.kind === 'missing') return <span className="text-ink3">{change.text}</span>;
  if (change.kind === 'flat') {
    return (
      <span className="inline-flex items-center gap-1 text-ink3">
        <Icon name="arrowR" className="ic-xs" />
        No change
      </span>
    );
  }
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1 font-medium',
        change.good ? 'text-good-fg' : 'text-crit-fg',
      )}
    >
      <Icon name={change.direction === 'up' ? 'arrowUp' : 'arrowDown'} className="ic-xs" />
      {change.text}
      <span className="sr-only">{change.good ? ', better' : ', worse'}</span>
    </span>
  );
}
