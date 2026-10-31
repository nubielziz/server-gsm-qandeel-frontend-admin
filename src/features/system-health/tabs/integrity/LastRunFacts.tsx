// LastRunFacts: the body of the Last run card of the Integrity tab: the result, when it ran, how long it took, who started it
// and the last success, or the running state while a run is going. Reads GET /admin/system/integrity (route group health).
import type { ReactNode } from 'react';
import { Badge } from '@/components/ui';
import { useNow } from '@/lib/format';
import { MetaBadge } from '../../components';
import type { IntegrityReport, JobRun } from '../../types';
import { agoText, durationText, startedByText } from './format';
import { finishedRun, lastRunMeta, runningSince } from './report';
import { When } from './When';

/** One label over one value. */
function Fact({ label, wide, children }: { label: string; wide?: boolean; children: ReactNode }) {
  return (
    <div className={wide ? 'col-span-2 min-w-0 md:col-span-1' : 'min-w-0'}>
      <dt className="text-xs text-ink3">{label}</dt>
      <dd className="m-0 mt-1 text-sm tabular-nums">{children}</dd>
    </div>
  );
}

/** A value the server has none of, in the muted ink. */
const Muted = ({ children }: { children: ReactNode }) => <span className="text-ink3">{children}</span>;

export interface LastRunFactsProps {
  report: IntegrityReport;
  /** The run this staff member started a moment ago, when the server does not name the running one. */
  started: JobRun | null;
}

/**
 * While a run is going the first cell says "Running, started 8s ago" and the card shows only when the run before it
 * happened, so an old duration or starter is never read as the new run's. A run that failed or was skipped shows its own
 * error under the facts. The hidden status line changes only when the state does, so a screen reader hears the end of
 * a run once.
 */
export function LastRunFacts({ report, started }: LastRunFactsProps) {
  // Ticks each second so "started 8s ago" moves; the other times only change a little.
  const now = useNow(1000);
  const run = finishedRun(report);
  const since = runningSince(report, started);
  const meta = lastRunMeta(report);

  const result = report.running ? (
    <Badge tone="neutral" icon="loader">
      {since ? `Running, started ${agoText(since, now)}` : 'Running'}
    </Badge>
  ) : (
    <MetaBadge meta={meta} />
  );
  const spoken = report.running ? 'The integrity check is running.' : `Last integrity check: ${meta.word}.`;

  return (
    <div>
      <p role="status" className="sr-only">
        {spoken}
      </p>
      <dl className="m-0 grid grid-cols-2 gap-x-4 gap-y-3 md:grid-cols-3 xl:grid-cols-5">
        <Fact label="Result" wide>
          {result}
        </Fact>
        {run && (
          <Fact label={report.running ? 'Previous run' : 'When'}>
            <When at={run.startedAt ?? run.finishedAt} now={now} />
          </Fact>
        )}
        {run && !report.running && (
          <>
            <Fact label="Duration">{durationText(run)}</Fact>
            <Fact label="Started by">{startedByText(run)}</Fact>
          </>
        )}
        {!run && !report.running && (
          <Fact label="When">
            <Muted>No run yet</Muted>
          </Fact>
        )}
        <Fact label="Last success">
          {report.lastSuccessAt ? <When at={report.lastSuccessAt} now={now} /> : <Muted>None yet</Muted>}
        </Fact>
      </dl>
      {!report.running && run && (run.status === 'failed' || run.status === 'skipped') && (
        <p className="mt-3 break-words text-sm text-ink2">
          <span className="font-medium">
            {run.status === 'failed' ? 'The run failed.' : 'The run was skipped.'}
          </span>{' '}
          {run.error && <span className="mono">{run.error}</span>}
        </p>
      )}
    </div>
  );
}
