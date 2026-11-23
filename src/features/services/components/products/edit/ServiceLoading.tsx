// ServiceLoading: the loading line of the edit view, drawn where a service (or a part of it) is still being read.
import { Skeleton } from '@/components/ui';

/** Three grey bars and a line for assistive technology. */
export function ServiceLoading() {
  return (
    <div role="status" className="flex flex-col gap-2">
      <span className="sr-only">Loading the service</span>
      <Skeleton width="40%" height={16} />
      <Skeleton />
      <Skeleton width="80%" />
    </div>
  );
}
