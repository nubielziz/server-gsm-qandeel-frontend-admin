// HealthyLine: the one quiet line that stands in for the healthy components ("11 components operational · Show").
import { cx } from '@/components/ui';
import { operationalLine } from './componentRows';

export interface HealthyLineProps {
  /** How many components the server marked `ok` that the line stands for. */
  count: number;
  /** A healthy row already stands in the list above the line, so the line counts the other ones. */
  others?: boolean;
  /** The healthy rows are in the list. */
  open: boolean;
  onToggle: () => void;
  /** Rows stand above the line, so a hairline separates them. */
  divided: boolean;
}

/** Muted text and a link-style button: it is not an alarm and not a green banner. */
export function HealthyLine({ count, others = false, open, onToggle, divided }: HealthyLineProps) {
  return (
    <p
      className={cx(
        'flex flex-wrap items-center gap-x-1.5 px-3.5 py-2 text-xs text-ink3',
        divided && 'border-t border-line',
      )}
    >
      <span>{operationalLine(count, others)}</span>
      <span aria-hidden="true">·</span>
      <button type="button" className="link" aria-expanded={open} onClick={onToggle}>
        {open ? 'Hide' : 'Show'}
        <span className="sr-only"> the operational components</span>
      </button>
    </p>
  );
}
