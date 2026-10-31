// FigureGrid: the small label-over-value facts of a store card (pool wait, locks, hit rate…) and the quiet line that holds
// the fine ones while something else is off. Data stores tab.
import { useId, useState } from 'react';
import { cx } from '@/components/ui';
import { foldHealthy, type Figure } from './storeFigures';

export interface FigureGridProps {
  /** In the order to draw (problems first). */
  figures: readonly Figure[];
  /** Column counts per breakpoint, for example `grid-cols-2 sm:grid-cols-3`. */
  columns: string;
}

/**
 * A definition list in a grid: the label sits over the value, so a long value wraps under its own label and never pushes a
 * neighbour. When a figure is off, the OK ones wait behind "N figures OK · Show"; when all are fine, all are drawn.
 */
export function FigureGrid({ figures, columns }: FigureGridProps) {
  const listId = useId();
  const [open, setOpen] = useState(false);
  const { shown, folded } = foldHealthy(figures);
  const visible = open ? figures : shown;
  return (
    <>
      <dl id={listId} className={cx('m-0 grid gap-x-4 gap-y-3', columns)}>
        {visible.map((figure) => (
          <div key={figure.key} className="min-w-0">
            <dt className="text-xs text-ink3">{figure.label}</dt>
            <dd className="m-0 mt-0.5 min-w-0 break-words text-sm tabular-nums">
              {figure.value}
              {figure.note && <p className="m-0 mt-0.5 text-xs text-ink3">{figure.note}</p>}
            </dd>
          </div>
        ))}
      </dl>
      {folded.length > 0 && (
        <p className="m-0 mt-3 text-xs text-ink3">
          {folded.length} {folded.length === 1 ? 'figure' : 'figures'} OK ·{' '}
          <button
            type="button"
            className="link"
            aria-expanded={open}
            aria-controls={listId}
            onClick={() => setOpen(!open)}
          >
            {open ? 'Hide' : 'Show'}
          </button>
        </p>
      )}
    </>
  );
}
