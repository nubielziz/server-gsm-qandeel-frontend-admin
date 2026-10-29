// SkeletonTable: loading placeholder in the shape of a table. Ports skelTable(cols, rows) of 20-ui.js.
import { Skeleton } from './Skeleton';

export interface SkeletonTableProps {
  cols?: number;
  rows?: number;
}

/** Row height follows the density setting through the --row-h variable, so it matches the real rows. */
export function SkeletonTable({ cols = 5, rows = 8 }: SkeletonTableProps) {
  return (
    <div className="p-0" role="status" aria-label="Loading">
      <span className="sr-only">Loading…</span>
      {Array.from({ length: rows }, (_, r) => (
        <div
          key={r}
          className="flex items-center gap-4 border-b border-line px-3.5"
          style={{ height: 'var(--row-h, 40px)' }}
        >
          {Array.from({ length: cols }, (_, c) => (
            <Skeleton
              key={c}
              // A deterministic spread of widths so the rows look like text, not like a grid.
              width={c === 0 ? 88 : 50 + ((r * 7 + c * 13) % 40)}
              height={10}
              className={c === cols - 1 ? 'ms-auto' : undefined}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
