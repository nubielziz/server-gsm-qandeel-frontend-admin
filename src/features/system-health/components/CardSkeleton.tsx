// CardSkeleton: the default first-load placeholder of a HealthCard, a few grey lines that a screen reader calls "Loading".
import { Skeleton } from '@/components/ui';

export interface CardSkeletonProps {
  /** Number of grey lines. */
  lines?: number;
}

/** Cards with a known shape (a table, a chart) pass their own skeleton; this one fits plain text and key figures. */
export function CardSkeleton({ lines = 3 }: CardSkeletonProps) {
  return (
    <div role="status" aria-label="Loading" className="space-y-2.5">
      <span className="sr-only">Loading…</span>
      {Array.from({ length: lines }, (_, i) => (
        // A deterministic spread of widths so the lines look like text.
        <Skeleton key={i} width={`${i === 0 ? 45 : 100 - ((i * 17) % 40)}%`} height={12} />
      ))}
    </div>
  );
}
