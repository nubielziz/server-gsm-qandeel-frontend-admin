// QuickAddPublishLine: under the result of a Quick add that asked to publish: "Publishing to the shop: ..." and where the publish run
// is, with a link to it. When the server made no run (the hand-over job died, or the preview failed), it says so and offers to
// prepare the preview of what this Quick add made, but only once the answer is fresh: while it reads again it says "checking". Counts
// and words are the publish run's own; nothing is worked out here.
import { Link } from 'react-router';
import { storefrontPublishPath, useStartPublish } from '@/features/storefront';
import { Button } from '@/components/ui';
import { useSupplierGrants } from '../hooks/useSupplierGrants';
import { useQuickAddPublishRun } from '../hooks/useQuickAddPublish';
import { publishLine } from '../lib/quickAddPublish';
import type { QuickAddRun } from '../types';

export interface QuickAddPublishLineProps {
  /** The Quick add run that ended. Nothing shows unless it asked to publish and made something. */
  run: QuickAddRun;
}

/** The state of the publish run, read every 5 s while it is live, and the button that prepares it when it was not made. */
export function QuickAddPublishLine({ run }: QuickAddPublishLineProps) {
  const { wanted, run: publishRun, readAt, query } = useQuickAddPublishRun(run);
  const prepare = useStartPublish();
  const grants = useSupplierGrants();
  if (!wanted) return null;

  const label = <span className="font-medium">Publishing to the shop:</span>;
  if (query.isError) {
    return (
      <p className="text-sm text-ink2">
        {label} could not be read.{' '}
        <button type="button" className="underline" onClick={() => void query.refetch()}>
          Retry
        </button>
      </p>
    );
  }
  if (query.data === undefined) return <p className="text-sm text-ink2">{label} checking...</p>;

  const line = publishLine(run, publishRun, readAt);
  // A reopened dialog shows the answer it kept while it reads again. If that answer said "not prepared", the button must wait for
  // the new read: the hand-over may have made the run meanwhile, and a quick click would make a second draft.
  if (line.kind === 'missing' && query.isFetching)
    return <p className="text-sm text-ink2">{label} checking...</p>;
  if (line.kind === 'preparing') {
    return (
      <p className="text-sm text-ink2" aria-live="polite">
        {label} preparing
      </p>
    );
  }
  if (line.kind === 'run') {
    return (
      <p className="text-sm text-ink2" aria-live="polite">
        {label} {line.text}.{' '}
        <Link className="link" to={storefrontPublishPath(line.run.id)}>
          Open the run
        </Link>
      </p>
    );
  }
  const lock = grants.needs('storefront:create');
  return (
    <div className="space-y-2" aria-live="polite">
      <p className="text-sm text-ink2">{label} The shop preview was not prepared.</p>
      <Button
        size="sm"
        loading={prepare.pending}
        disabled={lock.disabled}
        title={lock.title}
        onClick={() => prepare.start({ scope: { kind: 'quickAddRun', runId: run.id } })}
      >
        Prepare the shop preview
      </Button>
    </div>
  );
}
