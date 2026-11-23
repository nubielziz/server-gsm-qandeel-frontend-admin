// SinglesResultList: what the import did, batch by batch: the counts, and one line for each shop preview that was started (with a link to review
// and publish it), refused (with the server's words and Try again) or could not be asked for (no permission). Nothing here is worked out: the
// counts and the words are the server's.
import { Link } from 'react-router';
import { Button } from '@/components/ui';
import { storefrontPublishPath } from '@/features/storefront';
import {
  addedLine,
  batchCount,
  canTryAgain,
  isShown,
  retryKey,
  shopLineText,
  totalOf,
  type BatchOutcome,
  type FailedShopLine,
} from '../../lib/singlesFlow';

export interface SinglesResultListProps {
  /** The outcome of every batch the server answered, in order. */
  outcomes: readonly BatchOutcome[];
  /** How many supplier services the whole import sends (to say "Batch 2 of 3"). */
  total: number;
  /** Asks again for the shop preview of a batch whose preview could not be started; without it a failed line has no Try again. */
  onRetry?: (line: FailedShopLine) => void;
  /** The failed line being asked for now (its key), or null: its button shows the wait and no other can be pressed. */
  retrying?: string | null;
}

/**
 * The result of the answered batches. A console-made shop preview never publishes by itself: the link opens it for review. A line whose
 * preview could not be started keeps the import of its batch (it is done) and offers Try again; after a 403 it names the missing
 * permission instead, since asking again as the same role would be refused again.
 */
export function SinglesResultList({ outcomes, total, onRetry, retrying = null }: SinglesResultListProps) {
  const batches = batchCount(total);
  const lines = outcomes.flatMap((outcome, index) => (isShown(outcome.shop) ? [{ outcome, index }] : []));
  const started = lines.some(({ outcome }) => outcome.shop.kind === 'started');
  return (
    <div className="space-y-3">
      <p className="text-sm font-medium" aria-live="polite">
        {addedLine(totalOf(outcomes))}
      </p>
      {lines.length > 0 && (
        <ul
          className="divide-y divide-line border-y border-line"
          aria-label="Shop previews"
          aria-live="polite"
        >
          {lines.map(({ outcome, index }) => {
            const shop = outcome.shop;
            return (
              <li key={index} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-1 py-2 text-sm">
                <span className={shop.kind === 'started' ? undefined : 'text-crit-fg'}>
                  {shopLineText(shop, index + 1, batches)}
                </span>
                {shop.kind === 'started' && (
                  <Link className="underline" to={storefrontPublishPath(shop.runId)}>
                    Review and publish
                  </Link>
                )}
                {onRetry && canTryAgain(shop) && (
                  <Button
                    size="sm"
                    loading={retrying === retryKey(shop)}
                    disabled={retrying !== null}
                    aria-label={batches > 1 ? `Try again: batch ${index + 1} of ${batches}` : undefined}
                    onClick={() => onRetry(shop)}
                  >
                    Try again
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
      )}
      {started && (
        <p className="text-xs text-ink3">
          Nothing is on the shop yet. Open each preview, check it and publish it when you are ready.
        </p>
      )}
    </div>
  );
}
