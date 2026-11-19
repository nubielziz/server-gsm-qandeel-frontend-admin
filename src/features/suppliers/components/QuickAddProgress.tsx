// QuickAddProgress: step 3 of "Quick add…": where the run is (waiting, working with a progress bar, done, or stopped) and what it
// did. Shows what the server says; the dialog polls the run. Built in the demo's dialog style (the demo has no such screen).
import type { UseQueryResult } from '@tanstack/react-query';
import { ErrorState, Meter, SkeletonTable } from '@/components/ui';
import { progressLine, progressRatio, resultLines } from '../lib/quickAdd';
import type { QuickAddRun } from '../types';
import { QuickAddPublishLine } from './QuickAddPublishLine';

export interface QuickAddProgressProps {
  run: QuickAddRun | undefined;
  query: Pick<UseQueryResult<QuickAddRun>, 'isError' | 'error' | 'refetch'>;
}

/** The counts of a run that is over, and the services it could not add. */
function Outcome({ run }: { run: QuickAddRun }) {
  const [headline, ...rest] = resultLines(run);
  return (
    <>
      <p className="text-sm font-medium">{headline}</p>
      {rest.length > 0 && (
        <ul className="list-disc space-y-1 ps-5 text-sm text-ink2">
          {rest.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      )}
      {run.failures.length > 0 && (
        <ul
          className="max-h-[160px] divide-y divide-line overflow-auto rounded-md border border-line text-sm"
          aria-label="Services that could not be added"
        >
          {run.failures.map((failure) => (
            <li key={failure.supplierServiceId} className="px-3 py-1.5">
              <span className="font-medium">{failure.name}</span>{' '}
              <span className="text-ink3">{failure.reason}</span>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

/** Step 3: the run as the server last said. A failed read keeps the last known state and offers Retry. */
export function QuickAddProgress({ run, query }: QuickAddProgressProps) {
  if (run === undefined) {
    return query.isError ? (
      <ErrorState
        title="Could not load the quick add"
        error={query.error}
        onRetry={() => void query.refetch()}
      />
    ) : (
      <SkeletonTable cols={2} rows={3} />
    );
  }
  return (
    <div className="space-y-3">
      {run.status === 'queued' && (
        <p className="text-sm text-ink2" aria-live="polite">
          Waiting to start…
        </p>
      )}
      {run.status === 'running' && (
        <>
          <Meter ratio={progressRatio(run)} tone="neutral" label="Quick add progress" />
          <p className="text-sm text-ink2" aria-live="polite">
            {progressLine(run)}
          </p>
        </>
      )}
      {run.status === 'succeeded' && (
        <>
          <Outcome run={run} />
          <QuickAddPublishLine run={run} />
        </>
      )}
      {run.status === 'failed' && (
        <>
          <p className="text-sm text-crit-fg" role="alert">
            {run.error ?? 'The quick add stopped before it finished.'}
          </p>
          <Outcome run={run} />
          <QuickAddPublishLine run={run} />
          {/* A stalled run's error already ends with this hint. */}
          {!run.error?.endsWith('it continues with what is left.') && (
            <p className="text-sm text-ink2">Start it again: it continues with what is left.</p>
          )}
        </>
      )}
      {query.isError && (
        <p className="text-xs text-ink3">
          Could not refresh the progress.{' '}
          <button type="button" className="underline" onClick={() => void query.refetch()}>
            Retry
          </button>
        </p>
      )}
    </div>
  );
}
