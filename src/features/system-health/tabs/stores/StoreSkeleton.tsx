// StoreSkeleton: the first-load placeholder of the Postgres and Redis cards, in the shape of the card (a bar and a few facts).
import { Skeleton, cx } from '@/components/ui';

export interface StoreSkeletonProps {
  /** How many small facts the real card shows, so the card does not change height when the answer arrives. */
  cells: number;
  /** The column classes of the real figure grid, so the placeholders sit where the facts will. */
  columns: string;
}

/** A bar and a few small facts, in the shape of a store card. */
export function StoreSkeleton({ cells, columns }: StoreSkeletonProps) {
  return (
    <div role="status" aria-label="Loading" className="space-y-4">
      <span className="sr-only">Loading…</span>
      <div className="space-y-2">
        <Skeleton width={72} height={10} />
        <Skeleton width={160} height={16} />
        <Skeleton height={6} />
      </div>
      <div className={cx('grid gap-x-4 gap-y-3', columns)}>
        {Array.from({ length: cells }, (_, i) => (
          <div key={i} className="space-y-1.5">
            <Skeleton width={64} height={10} />
            {/* A deterministic spread of widths so the facts look like text. */}
            <Skeleton width={44 + ((i * 17) % 40)} height={14} />
          </div>
        ))}
      </div>
    </div>
  );
}
