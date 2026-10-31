// KpiProblem: what a KPI tile shows while it has no figure: loading, no access, monitoring unavailable, a failed read with
// Retry, or an answer with nothing in it. Each is neutral; none is ever drawn as healthy.
import { Button, Icon, Skeleton } from '@/components/ui';
import { isForbiddenError } from '../lib';
import type { HealthQuery } from '../components/HealthCard';
import { isMonitoringUnavailable } from '../hooks';
import { failureOf } from './failure';

/** The tile's first load: the shape of a value and a trend line. */
function Loading() {
  return (
    <div role="status" aria-label="Loading" className="mt-2 space-y-2.5">
      <span className="sr-only">Loading…</span>
      <Skeleton width={76} height={22} />
      <Skeleton width="70%" height={10} />
    </div>
  );
}

export interface KpiProblemProps {
  query: HealthQuery<unknown>;
}

/**
 * Picks the state by what the read says: still loading, forbidden (403), the monitoring backend is down (503
 * MONITORING_UNAVAILABLE), any other failure (what failed, the request id and Retry), or a 200 the tile cannot show.
 */
export function KpiProblem({ query }: KpiProblemProps) {
  const error = query.isError ? query.error : null;
  if (error === null) {
    return query.isPending ? <Loading /> : <p className="mt-1.5 text-base font-medium text-ink3">No data</p>;
  }
  if (isForbiddenError(error)) {
    return <p className="mt-1.5 text-xs text-ink3">You need the system:read permission.</p>;
  }
  const failure = failureOf(error);
  if (isMonitoringUnavailable(error)) {
    return (
      <div className="mt-1.5" title={failure.detail}>
        <p className="flex items-center gap-1 text-sm font-medium text-ink2">
          <Icon name="pulse" className="ic-sm flex-none text-ink3" />
          Monitoring unavailable
        </p>
        <p className="mt-0.5 text-xs text-ink3">Not counted as healthy.</p>
      </div>
    );
  }
  return (
    <div className="mt-1.5 space-y-1" role="alert">
      <p className="text-sm font-medium text-ink">Could not load</p>
      <p className="text-xs text-ink3">{failure.detail ?? failure.title}</p>
      {failure.requestId && (
        <p className="text-xs text-ink3">
          Request <span className="mono">{failure.requestId}</span>
        </p>
      )}
      <Button size="sm" onClick={() => void query.refetch()} loading={query.isFetching}>
        {/* While it loads the button shows its own spinner. */}
        {!query.isFetching && <Icon name="refresh" className="ic-sm" />}
        Retry
      </Button>
    </div>
  );
}
