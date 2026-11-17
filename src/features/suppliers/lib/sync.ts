// What the toast says after "Sync now": the cost changes, the services the sync adopted and the balance it read.
import { money } from '@/lib/format';
import type { SyncResult } from '../types';

/**
 * The second line of the sync toast.
 *
 * Why: a sync can also change services (backend feature 33): one that was imported as an IMEI service although its supplier
 * asks for something else in the main box (an ECID, a serial number) becomes a server service that asks for that. Staff
 * must hear it, because the order form of those services changes.
 *
 * @param result the answer of `POST /admin/suppliers/:id/sync`
 * @returns the cost sentence, the adoption sentence when any service was adopted, and the balance
 */
export function syncSummary(result: SyncResult): string {
  const cost = result.changed > 0 ? `${result.changed} with a changed cost.` : 'No cost changes.';
  // An older backend sends no count: nothing was adopted.
  const adopted = result.adopted ?? 0;
  const moved =
    adopted > 0
      ? ` ${adopted} ${adopted === 1 ? 'service now asks' : 'services now ask'} for the supplier’s own input (an ECID or a serial number) instead of an IMEI.`
      : '';
  return `${cost}${moved} Balance ${money(result.balance)}.`;
}
