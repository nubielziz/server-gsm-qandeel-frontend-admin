// PublishRunView: one run's page on the Publish tab (`&run=<id>`): its header and the part its status calls for: the preview being
// prepared, the draft (the preview), the progress of the publishing, or the result. The run is read again every 1.5 seconds while
// it works, so the page moves from one part to the next by itself.
import { ErrorState, SkeletonTable } from '@/components/ui';
import type { Id } from '@/lib/api';
import { usePublishRun } from '../../hooks/usePublishRun';
import type { StorefrontGrants } from '../../hooks/useStorefrontGrants';
import { isFinished } from '../../lib/publish';
import { PublishPreparing } from './PublishPreparing';
import { PublishPreview } from './PublishPreview';
import { PublishProgress } from './PublishProgress';
import { PublishResult } from './PublishResult';
import { PublishRunHeader } from './PublishRunHeader';

export interface PublishRunViewProps {
  runId: Id;
  grants: StorefrontGrants;
  onOpen: (runId: Id) => void;
  onClose: () => void;
}

/** The header, then the part for the run's status; a run that cannot be read says so with a Retry. */
export function PublishRunView({ runId, grants, onOpen, onClose }: PublishRunViewProps) {
  const { run, query } = usePublishRun(runId);
  if (!run) {
    return query.isError ? (
      <ErrorState title="Could not load this run" error={query.error} onRetry={() => void query.refetch()} />
    ) : (
      <SkeletonTable cols={3} rows={4} />
    );
  }
  const reread = () => void query.refetch();
  return (
    <div className="grid gap-0 divide-y divide-line">
      <PublishRunHeader run={run} />
      {run.status === 'preparing' && (
        <PublishPreparing run={run} canCancel={grants.needs('storefront:create')} onClose={onClose} />
      )}
      {run.status === 'draft' && (
        <PublishPreview run={run} grants={grants} onOpen={onOpen} onClose={onClose} />
      )}
      {(run.status === 'queued' || run.status === 'running') && (
        <PublishProgress run={run} canStop={grants.needs('storefront:publish')} />
      )}
      {isFinished(run) && <PublishResult run={run} grants={grants} onOpen={onOpen} onReread={reread} />}
      {query.isError && (
        <p className="px-3.5 py-2 text-xs text-ink3">
          Could not refresh this run; the last answer is shown.{' '}
          <button type="button" className="link" onClick={reread}>
            Retry
          </button>
        </p>
      )}
    </div>
  );
}
