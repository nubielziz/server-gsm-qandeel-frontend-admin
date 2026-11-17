// PublishOutcome: the top of a finished run's page: the headline (how many services are on the shop, or were created switched
// off), the counts, the server's error for a run that stopped with the buttons that go on (Continue, or Prepare again when the
// preview itself never finished), and the way on to the rows that were left out. Shows what the server says; it decides nothing.
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

/** What a stopped or cancelled run says in place of a headline. */
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
    return (
      <p className="text-sm">
        {run.startedAt === null
          ? 'This preview was discarded.'
          : `This run was stopped. ${run.counts.published === 1 ? 'The service' : 'The services'} already published stay on the shop.`}
      </p>
    );
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
      {run.status === 'succeeded' ? (
        <>
          <p className="text-base font-semibold">{headline(run)}</p>
          <p className="text-sm text-ink2">{countsLine(run)}</p>
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
        {failedEarly && (
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
        {rest > 0 && !failedEarly && run.startedAt !== null && (
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
