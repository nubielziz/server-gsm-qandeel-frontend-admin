// StatusBadge: a refund, dispute or payment state as a badge (icon + word). Ports refBadge, dispBadge and chargeBadge of the demo.
import { Badge } from '@/components/ui';
import type { BadgeSpec } from '../lib/labels';

/** Give it `badgeFor(REFUND_BADGE, refund.status)` (or the dispute or payment map). */
export function StatusBadge({ spec }: { spec: BadgeSpec }) {
  return (
    <Badge tone={spec.tone} icon={spec.icon}>
      {spec.label}
    </Badge>
  );
}
