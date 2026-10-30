// RefreshResultDialog: what the server said after "Refresh rates": the currencies it updated with their new rate, the ones it could not
// update with the reason, and where the rates came from. The console shows the answer as it is and decides nothing from it.
import { Badge, Button, Modal } from '@/components/ui';
import { trimDecimal } from '../lib/decimal';
import type { RefreshFxResult } from '../types';

/** The result of a refresh, in a dialog with a Close button. */
export function RefreshResultDialog({ result, onClose }: { result: RefreshFxResult; onClose: () => void }) {
  const refreshed = result.refreshed ?? [];
  const failed = result.failed ?? [];
  return (
    <Modal
      open
      title="Rates refreshed"
      sub={result.source ? `Source: ${result.source}` : undefined}
      onClose={onClose}
      footer={<Button onClick={onClose}>Close</Button>}
    >
      <div className="space-y-3 text-sm">
        {refreshed.length === 0 && failed.length === 0 && (
          <p className="text-ink2">The server had nothing to update.</p>
        )}
        {refreshed.length > 0 && (
          <ul
            className="m-0 list-none divide-y divide-line rounded-lg border border-line p-0"
            aria-label="Updated rates"
          >
            {refreshed.map((rate) => (
              <li key={rate.code} className="flex items-center justify-between gap-3 px-3 py-2">
                <span className="font-medium">{rate.code}</span>
                <span className="tabular-nums text-ink2">
                  1 USD = {trimDecimal(rate.rateToBase)} {rate.code}
                </span>
              </li>
            ))}
          </ul>
        )}
        {failed.length > 0 && (
          <ul
            className="m-0 list-none divide-y divide-line rounded-lg border border-line p-0"
            aria-label="Rates that failed"
          >
            {failed.map((item) => (
              <li key={item.code} className="flex items-start justify-between gap-3 px-3 py-2">
                <span className="font-medium">{item.code}</span>
                <span className="min-w-0 flex-1 text-end text-crit-fg">{item.message}</span>
                <Badge tone="crit" icon="alert">
                  Not updated
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Modal>
  );
}
