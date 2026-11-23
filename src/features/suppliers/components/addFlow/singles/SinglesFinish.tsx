// SinglesFinish: the last step of the single-services path: what is about to be added, the switch for the shop, then, once Start is
// pressed, the progress and the result. A batch that failed leaves the result of the ones before it on screen, and so do the batches of
// an earlier run the person went Back from.
import type { ShopSwitchState } from '../../../hooks/useSinglesShopRule';
import type { RunState } from '../../../lib/importPlan';
import { sentOf, type BatchOutcome, type FailedShopLine } from '../../../lib/singlesFlow';
import { SinglesProgress } from './SinglesProgress';
import { SinglesResult } from './SinglesResult';
import { SinglesShopSwitch } from './SinglesShopSwitch';

export interface SinglesFinishProps {
  /** "Ready to add 3 services from Nordic GSM: 2 new, 1 with a changed cost." */
  summary: string;
  /** Some picked services only change the cost of a service that exists: they are never prepared for the shop. */
  hasChanged: boolean;
  prepare: boolean;
  onPrepare: (on: boolean) => void;
  shop: ShopSwitchState;
  /** Where the import is while a batch goes; null when none does. */
  run: RunState | null;
  /** The outcome of every batch of this run answered so far. */
  outcomes: readonly BatchOutcome[];
  /** The batches of earlier runs the person went Back from: they stay in the result, before this run's. */
  earlier: readonly BatchOutcome[];
  /** How many supplier services this run sends. */
  total: number;
  onNavigate: () => void;
  /** Asks again for the shop preview of a batch whose preview could not be started. */
  onRetry: (line: FailedShopLine) => void;
  /** The failed line being asked for now (its key), or null. */
  retrying: string | null;
}

/** The summary and the switch before the start; the progress and the result after it. */
export function SinglesFinish({
  summary,
  hasChanged,
  prepare,
  onPrepare,
  shop,
  run,
  outcomes,
  earlier,
  total,
  onNavigate,
  onRetry,
  retrying,
}: SinglesFinishProps) {
  const begun = outcomes.length > 0 || (run !== null && run.upTo !== null);
  const shown = [...earlier, ...outcomes];
  return (
    <div className="space-y-4">
      <p className="text-sm text-ink2">{summary}</p>
      <SinglesShopSwitch
        on={prepare}
        onChange={onPrepare}
        shop={shop}
        fixed={begun}
        onNavigate={onNavigate}
      />
      {hasChanged && (
        <p className="text-xs text-ink3">
          A service whose cost changed is updated. Only the services made new are prepared for the shop.
        </p>
      )}
      {run !== null && run.upTo !== null && <SinglesProgress run={run} />}
      {shown.length > 0 && (
        <SinglesResult
          outcomes={shown}
          total={sentOf(earlier) + total}
          onNavigate={onNavigate}
          onRetry={onRetry}
          retrying={retrying}
        />
      )}
    </div>
  );
}
