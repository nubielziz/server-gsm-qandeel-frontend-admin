// ChartSkeleton: the first-load placeholder of the two chart cards, one grey block as tall as the chart, so nothing jumps.
import { Skeleton } from '@/components/ui';

/** A screen reader hears "Loading" once; the block itself is decorative. */
export function ChartSkeleton() {
  return (
    <div role="status" aria-label="Loading">
      <span className="sr-only">Loading…</span>
      <Skeleton height={196} />
    </div>
  );
}
