// PageLoading: what a page shows while its code chunk loads (pages are lazy-loaded per feature) or while the start
// page works out where to go. Same shape as a list page: a header line and a table skeleton.
import { Skeleton, SkeletonTable } from '@/components/ui';

export function PageLoading() {
  return (
    <div role="status" aria-label="Loading page">
      <Skeleton className="mb-4 h-7 w-56" />
      <SkeletonTable />
    </div>
  );
}
