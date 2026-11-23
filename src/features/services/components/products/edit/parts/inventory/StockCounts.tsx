// StockCounts: how many stored codes the service has in each status, as one plain line under the "Stored codes" heading.
import { num } from '@/lib/format';
import { StockStatus } from './StockStatus';
import { STOCK_STATUSES } from './stockStatus';
import type { StockCounts as Counts } from './useStockCounts';

/** The server's counts; a count that is not known yet (or could not be read) shows a dash. */
export function StockCounts({ counts, failed }: { counts: Counts; failed: boolean }) {
  return (
    <>
      <ul aria-label="Codes in stock" className="m-0 flex list-none flex-wrap gap-x-6 gap-y-1 p-0 text-sm">
        {STOCK_STATUSES.map((status) => (
          <li key={status} className="flex items-center gap-2">
            <StockStatus status={status} />
            <span className="font-medium tabular-nums">
              {counts[status] === undefined ? '–' : num(counts[status])}
            </span>
          </li>
        ))}
      </ul>
      {failed && <p className="hint">Some counts could not be read. Refresh to try again.</p>}
    </>
  );
}
