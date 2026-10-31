// IntegrityTab: the Integrity tab of the System health page: the last run with Run check now, the four ledger checks, what the
// failing ones found, and a note that the check never changes anything. Route group health (GET /admin/system/integrity).
import { PartBoundary } from '../../header/PartBoundary';
import { POLL, useIntegrity } from '../../hooks';
import { ChecksCard } from './ChecksCard';
import { FindingsCard } from './FindingsCard';
import { LastRunCard } from './LastRunCard';
import { LedgerNote } from './LedgerNote';

/**
 * The tab only composes. All its cards read the one integrity report, which polls every few seconds while a run is
 * going. Each card sits in its own `PartBoundary`, so a shape the console cannot draw spoils that card only. When the
 * report cannot be read at all, the Last run card shows the one error (with the request id and Retry) and the other
 * cards stay away, so the same failure is not printed three times.
 */
export function IntegrityTab() {
  const integrity = useIntegrity();
  const report = integrity.data;
  const unreadable = report === undefined && integrity.isError;
  const interval = report?.running ? POLL.running : POLL.normal;
  // A new answer lets a card that failed to draw try again.
  const resetKey = integrity.dataUpdatedAt;

  return (
    <div className="grid grid-cols-12 gap-4">
      <div className="col-span-12">
        <PartBoundary name="The last run" resetKey={resetKey}>
          <LastRunCard query={integrity} interval={interval} />
        </PartBoundary>
      </div>
      {!unreadable && (
        <div className="col-span-12">
          <PartBoundary name="The ledger checks" resetKey={resetKey}>
            <ChecksCard query={integrity} interval={interval} />
          </PartBoundary>
        </div>
      )}
      {/* The card draws nothing while no check fails; `empty:hidden` then leaves no gap for it. */}
      <div className="col-span-12 empty:hidden">
        <PartBoundary name="The findings" resetKey={resetKey}>
          <FindingsCard query={integrity} interval={interval} />
        </PartBoundary>
      </div>
      <div className="col-span-12">
        <LedgerNote />
      </div>
    </div>
  );
}
