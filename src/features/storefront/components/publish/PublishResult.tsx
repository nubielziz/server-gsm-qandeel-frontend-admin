// PublishResult: a run that is over (succeeded, failed or cancelled): the headline and the buttons that go on, the run switch when
// something was published, and the table of rows when the apply began. A preview that was only discarded has no table.
import type { StorefrontGrants } from '../../hooks/useStorefrontGrants';
import type { PublishRun } from '../../types';
import { PublishOutcome } from './PublishOutcome';
import { PublishResultTable } from './PublishResultTable';
import { PublishSwitch } from './PublishSwitch';

export interface PublishResultProps {
  run: PublishRun;
  grants: StorefrontGrants;
  onOpen: (runId: number) => void;
  onReread: () => void;
}

/** Outcome, switch and rows, split by hairlines (no card around them). */
export function PublishResult({ run, grants, onOpen, onReread }: PublishResultProps) {
  return (
    <>
      <PublishOutcome run={run} grants={grants} onOpen={onOpen} onReread={onReread} />
      {run.counts.published > 0 && (
        <div className="border-t border-line">
          <PublishSwitch run={run} grants={grants} onReread={onReread} />
        </div>
      )}
      {run.startedAt !== null && (
        <div className="border-t border-line">
          <PublishResultTable run={run} runId={run.id} />
        </div>
      )}
    </>
  );
}
