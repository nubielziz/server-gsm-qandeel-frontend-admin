// SupplierChartsSkeleton: the charts' place while the supplier's detail loads, so the panel does not jump when the history arrives.
import { Skeleton } from '@/components/ui';

export function SupplierChartsSkeleton() {
  return (
    <div className="grid gap-0 border-b border-line md:grid-cols-2" role="status" aria-label="Loading charts">
      <div className="p-3.5">
        <Skeleton width={160} height={12} />
        <div className="mt-3">
          <Skeleton height={150} />
        </div>
      </div>
      <div className="border-t border-line p-3.5 md:border-t-0">
        <Skeleton width={160} height={12} />
        <div className="mt-3">
          <Skeleton height={150} />
        </div>
      </div>
    </div>
  );
}
