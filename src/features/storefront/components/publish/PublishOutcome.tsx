// PublishOutcome: the top of a finished run's page: the headline (how many services are on the shop, or were created switched
// off), the counts, the server's error for a run that stopped with the buttons that go on (Continue, or Prepare again when the
// preview itself never finished or was discarded while it was prepared), and the way on to the rows that were left out. Shows what
// the server says; it decides nothing.
import { useState } from 'react';
import { Link } from 'react-router';
import { Button, ButtonLink } from '@/components/ui';
import { useApplyPublishRun, useCreatePublishRun } from '../../hooks/usePublishMutations';
import type { StorefrontGrants } from '../../hooks/useStorefrontGrants';
import { storefrontListPath, storefrontPublishPath } from '../../lib/paths';
import {
  CONTINUE_HINT,
  countsLine,
  headline,
  isAlreadyRunning,
  leftOutCount,
  refusalText,
} from '../../lib/publish';
import type { CreatePublishRunBody, PublishRun } from '../../types';

export interface PublishOutcomeProps {
  run: PublishRun;
  grants: StorefrontGrants;
  /** Goes to another run (the one "Review the rest" or "Prepare again" makes). */
  onOpen: (runId: number) => void;
  /** Reads the run again (after a 409 that says it is already working). */
  onReread: () => void;
}

/** What a failed run, a checked-again preview or a discarded preview says in place of a headline. */
function StoppedText({ run }: { run: PublishRun }) {
  if (run.status === 'cancelled') {
    if (run.replacedBy !== null) {
      return (
        <p className="text-sm">
          This preview was checked again.{' '}
          <Link className="link" to={storefrontPublishPath(run.replacedBy)}>
            Open the newer run
          </Link>
        </p>
      );
    }
    return <p className="text-sm">This preview was discarded.</p>;
  }
  return (
    <>
      <p className="text-sm text-crit-fg" role="alert">
        {run.error ?? 'The run stopped before it finished.'}
      </p>
      {/* A stalled run's error already ends with this hint, and a preview that never finished starts again from the start. */}
      {run.preparedAt !== null && !run.error?.endsWith(CONTINUE_HINT) && (
        <p className="text-sm text-ink2">{CONTINUE_HINT}</p>
      )}
    </>
  );
}

/** Headline or error, the counts, and the buttons of a finished run. */
export function PublishOutcome({ run, grants, onOpen, onReread }: PublishOutcomeProps) {
  const [error, setError] = useState<string | null>(null);
  const create = useCreatePublishRun();
  const apply = useApplyPublishRun();
  const publishLock = grants.needs('storefront:publish');
  const createLock = grants.needs('storefront:create');
  const rest = leftOutCount(run);
  const failedEarly = run.status === 'failed' && run.preparedAt === null;
  // A "Check again" run that was cancelled while it was still prepared has no rows to look at, and the draft it came from points at
  // it: Prepare again copies that draft once more, with the staff's edits (plan correction 14). Other scopes just start again.
  const discardedEarly = run.status === 'cancelled' && run.preparedAt === null && run.scope.kind === 'run';
  const prepareAgain = failedEarly || discardedEarly;
  // A run stopped after it started says what it published, as a finished one does; a preview discarded before that says so.
  const stopped = run.status === 'cancelled' && run.startedAt !== null && run.replacedBy === null;
  // A run stopped while it still waited for its turn has no `startedAt`, and the wire cannot tell it from a discarded preview:
  // both can be reviewed again. A preview that was checked again has its newer run instead.
  const reviewable =
    run.startedAt !== null ||
    (run.status === 'cancelled' && run.preparedAt !== null && run.replacedBy === null);

  const make = (body: CreatePublishRunBody) => {
    setError(null);
    create.mutate(body, { onSuccess: (made) => onOpen(made.id), onError: (e) => setError(refusalText(e)) });
  };
  const resume = () => {
    setError(null);
    apply.mutate(
      { id: run.id, body: {} },
      {
        onError: (e) => {
          setError(refusalText(e));
          if (isAlreadyRunning(e)) onReread();
        },
      },
    );
  };

  return (
    <div className="space-y-2 px-3.5 py-4">
      {run.status === 'succeeded' || stopped ? (
        <>
          <p className="text-base font-semibold">{headline(run)}</p>
          <p className="text-sm text-ink2">{countsLine(run)}</p>
          {/* A run that finished can still carry a note in `error` (its choice was cut at the most a run takes): a muted line, not an alert. */}
          {run.status === 'succeeded' && run.error && <p className="text-sm text-ink2">{run.error}</p>}
          {stopped && <p className="text-sm text-ink2">This run was stopped before it finished.</p>}
        </>
      ) : (
        <>
          <StoppedText run={run} />
          {run.status === 'failed' && run.counts.published > 0 && (
            <p className="text-sm text-ink2">{countsLine(run)}</p>
          )}
        </>
      )}
      <div className="flex flex-wrap items-center gap-2 pt-1">
        {run.status === 'failed' && !failedEarly && (
          <Button variant="primary" size="sm" loading={apply.isPending} onClick={resume} {...publishLock}>
            Continue
          </Button>
        )}
        {prepareAgain && (
          <Button
            variant="primary"
            size="sm"
            loading={create.isPending}
            onClick={() => make({ scope: run.scope, listed: run.listed })}
            {...createLock}
          >
            Prepare again
          </Button>
        )}
        {rest > 0 && !prepareAgain && reviewable && (
          <Button
            size="sm"
            loading={create.isPending}
            onClick={() => make({ scope: { kind: 'run', runId: run.id } })}
            {...createLock}
          >
            Review the {rest} left out
          </Button>
        )}
        {run.counts.published > 0 && (
          <ButtonLink variant="ghost" size="sm" to={storefrontListPath()}>
            See them in Services on sale
          </ButtonLink>
        )}
      </div>
      {error && (
        <p className="text-sm text-crit-fg" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
