// SupportPart: the "Support" part of an account's record: the support feature's own list of this account's tickets, each opening its thread
// on the Support page, with the link that opens the inbox filtered to this account. The part is read-only.
import { AccountTickets } from '@/features/support';
import type { AccountPartProps } from '../types';

/**
 * The account's tickets, newest activity first. The list draws its own loading, error and empty states and its "Open in Support" link
 * (`/support?accountId=<id>`); the part is offered only with `support:read` (the registry's rule), and the list reads only with it too.
 */
export function SupportPart({ account }: AccountPartProps) {
  return (
    <div className="view-frame">
      <div>
        <AccountTickets accountId={account.id} />
      </div>
    </div>
  );
}
