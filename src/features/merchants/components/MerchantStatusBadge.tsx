// MerchantStatusBadge: a merchant's status as a badge (icon + word). Ports merBadge of 20-ui.js. Exported for the pages that
// show a merchant. A status the console does not know yet shows as a plain neutral badge with the server's word.
import { Badge } from '@/components/ui';
import { STATUS_BADGE } from '../lib/status';
import type { ClientStatus } from '../types';

/** Shows a merchant's status as a badge. */
export function MerchantStatusBadge({ status }: { status: string }) {
  const look = Object.hasOwn(STATUS_BADGE, status) ? STATUS_BADGE[status as ClientStatus] : undefined;
  if (!look) return <Badge tone="neutral">{status}</Badge>;
  return (
    <Badge tone={look.tone} icon={look.icon}>
      {look.label}
    </Badge>
  );
}
