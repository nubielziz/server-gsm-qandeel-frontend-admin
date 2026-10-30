// SupplierStatus: the badge of a supplier row (Disabled, Healthy, Degraded or Down). Ports supBadge() of 20-ui.js.
import { Badge } from '@/components/ui';
import type { SupplierHealth } from '../types';

/** A disabled supplier says so whatever its last health reading was; status is never colour alone, so each badge has an icon and a word. */
export function SupplierStatus({ supplier }: { supplier: SupplierHealth }) {
  if (!supplier.enabled) {
    return (
      <Badge tone="neutral" icon="ban">
        Disabled
      </Badge>
    );
  }
  switch (supplier.health) {
    case 'up':
      return (
        <Badge tone="good" icon="checkCircle">
          Healthy
        </Badge>
      );
    case 'degraded':
      return (
        <Badge tone="serious" icon="alert">
          Degraded
        </Badge>
      );
    default:
      return (
        <Badge tone="crit" icon="xCircle">
          Down
        </Badge>
      );
  }
}
