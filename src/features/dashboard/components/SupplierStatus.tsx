// SupplierStatus: the badge of a supplier row (Disabled, Healthy, Degraded, Down, or No recent calls for an idle supplier, M260).
// Ports supBadge() of 20-ui.js.
import { Badge } from '@/components/ui';
import type { SupplierHealth } from '../types';

/**
 * The status badge of one supplier row.
 *
 * Why: a disabled supplier says so whatever its last health reading was; status is never colour alone, so each badge has an icon
 * and a word. An idle supplier (no calls to judge) is neutral: no data is not healthy, and it is not a fault either (M260). A word
 * the console does not know shows as itself, in neutral, never as green.
 */
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
    case 'down':
      return (
        <Badge tone="crit" icon="xCircle">
          Down
        </Badge>
      );
    case 'unknown':
      return (
        <Badge tone="neutral" icon="info">
          No recent calls
        </Badge>
      );
    default:
      return (
        <Badge tone="neutral" icon="info">
          {String(supplier.health)}
        </Badge>
      );
  }
}
