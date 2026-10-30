// KycStatusBadge: the state of a verification request as a badge (icon + word). A request status the console does not know yet
// shows as a plain neutral badge with the server's word.
import { Badge } from '@/components/ui';
import { KYC_BADGE } from '../lib/kyc';
import type { KycSubmissionStatus } from '../types';

/** Shows the state of a request as a badge. */
export function KycStatusBadge({ status }: { status: string }) {
  const look = Object.hasOwn(KYC_BADGE, status) ? KYC_BADGE[status as KycSubmissionStatus] : undefined;
  if (!look) return <Badge tone="neutral">{status}</Badge>;
  return (
    <Badge tone={look.tone} icon={look.icon}>
      {look.label}
    </Badge>
  );
}
