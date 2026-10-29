// SkeletonStat: loading placeholder for a StatGrid. Ports skelStat(n) of 20-ui.js.
import { cx } from './cx';
import { Skeleton } from './Skeleton';

export function SkeletonStat({ cells = 5 }: { cells?: number }) {
  return (
    <div className="panel mb-4 grid grid-cols-2 md:grid-cols-5" role="status" aria-label="Loading">
      <span className="sr-only">Loading…</span>
      {Array.from({ length: cells }, (_, i) => (
        <div
          key={i}
          className={cx('border-line p-3.5', i > 0 && 'md:border-s', i > 1 && 'border-t md:border-t-0')}
        >
          <Skeleton width={64} height={10} />
          <div className="mt-2.5">
            <Skeleton width={92} height={20} />
          </div>
          <div className="mt-2">
            <Skeleton width={72} height={10} />
          </div>
        </div>
      ))}
    </div>
  );
}
