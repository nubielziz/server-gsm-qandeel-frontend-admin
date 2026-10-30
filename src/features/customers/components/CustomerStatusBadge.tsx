// CustomerStatusBadge: the status of a customer as a badge with a word and an icon. Ports custBadge of 12-state-b2c.js. A status the
// console does not know shows its raw value in a neutral badge.
import { Badge } from '@/components/ui';
import { statusBadge } from '../lib/status';
import type { CustomerStatus } from '../types';

export function CustomerStatusBadge({ status }: { status: CustomerStatus }) {
  const badge = statusBadge(status);
  return (
    <Badge tone={badge.tone} icon={badge.icon}>
      {badge.label}
    </Badge>
  );
}
