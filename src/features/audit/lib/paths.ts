// The address of the Audit log for other pages to link to (ARCHITECTURE §5.2): the one builder of an address of this page, so a
// page that links here never writes the parameters itself. The page reads them with `parseView` (`lib/view.ts`).
import type { Id } from '@/lib/api';

/**
 * The address of the Audit log filtered to one account: `/audit?type=account&record=<id>`. The page sends it to the server as
 * `accountId`, so the list holds the rows that say `account` or `merchant` with that number and the old `customer` rows of the
 * account's old number.
 */
export function auditAccountPath(accountId: Id): string {
  return `/audit?type=account&record=${accountId}`;
}
