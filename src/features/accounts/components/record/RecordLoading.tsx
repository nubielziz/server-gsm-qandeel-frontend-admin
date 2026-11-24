// RecordLoading: what the record shows while the account is being read: a title bar, a six-line menu and a table (the shape of the page).
import { Skeleton, SkeletonTable } from '@/components/ui';

/** Skeletons in the shape of the parts menu and the part beside it. */
export function RecordLoading() {
  return (
    <div className="parts-layout" role="status" aria-label="Loading the account">
      <div className="parts-side">
        <Skeleton width="70%" height={18} />
        <div className="mt-3 flex flex-col gap-2.5">
          {Array.from({ length: 6 }, (_, line) => (
            <Skeleton key={line} width={`${60 + ((line * 11) % 30)}%`} height={12} />
          ))}
        </div>
      </div>
      <div className="parts-main">
        <SkeletonTable cols={4} rows={6} />
      </div>
    </div>
  );
}
