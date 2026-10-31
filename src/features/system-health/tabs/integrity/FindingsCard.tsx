// FindingsCard: the "Findings" card of the Integrity tab: what each failing check found, check by check. Reads
// GET /admin/system/integrity (route group health). It appears only while a check fails.
import { useNow } from '@/lib/format';
import { HealthCard, type HealthQuery } from '../../components';
import { useHealthGrants } from '../../hooks';
import type { IntegrityCheck, IntegrityReport } from '../../types';
import { FindingsTable } from './FindingsTable';
import { listedText } from './format';
import { failingChecks } from './report';

/** One failing check: its label, how many findings it has and how many came with the answer, then the findings. */
function CheckFindings({
  check,
  canOpenLedger,
  now,
}: {
  check: IntegrityCheck;
  canOpenLedger: boolean;
  now: number;
}) {
  return (
    <section aria-label={check.label}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 px-3.5 pb-2 pt-3">
        <h3 className="text-sm font-medium">{check.label}</h3>
        <p className="text-xs text-ink3">{listedText(check.count, check.findings.length)}</p>
      </div>
      {check.findings.length > 0 && (
        <FindingsTable
          findings={check.findings}
          canOpenLedger={canOpenLedger}
          now={now}
          caption={`Findings: ${check.label}`}
        />
      )}
    </section>
  );
}

/**
 * The list of failing checks. It has its own clock, started when the first answer is on screen, so "3h ago" counts from
 * a moment after the server wrote the time and not from before the card existed.
 */
function FindingsBody({ report }: { report: IntegrityReport }) {
  const grants = useHealthGrants();
  const now = useNow(30_000);
  const canOpenLedger = grants.can('ledger:read');
  return (
    <div className="divide-y divide-line">
      {failingChecks(report.checks).map((check) => (
        <CheckFindings key={check.key} check={check} canOpenLedger={canOpenLedger} now={now} />
      ))}
    </div>
  );
}

export interface FindingsCardProps {
  query: HealthQuery<IntegrityReport>;
  /** Poll interval of the report in ms, which is shorter while a run is going. */
  interval: number;
}

/**
 * The server sends the first findings of each check and the full count; a check with more findings than were sent
 * says "Showing the first 5 of 23". The card draws nothing while no check fails (and before the first answer), so a
 * clean ledger has no empty card.
 */
export function FindingsCard({ query, interval }: FindingsCardProps) {
  if (query.data === undefined || failingChecks(query.data.checks).length === 0) return null;
  return (
    <HealthCard
      title="Findings"
      sub="What the failing checks found"
      query={query}
      interval={interval}
      flush
      errorTitle="Could not load the findings"
      permission="system:read"
    >
      {(report) => <FindingsBody report={report} />}
    </HealthCard>
  );
}
