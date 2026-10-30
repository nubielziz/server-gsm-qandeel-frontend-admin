// SupplierStatusBadge: the badge of a supplier's state (Healthy, Degraded, Down or Disabled). Ports supBadge of 20-ui.js.
// Other pages use it to show a supplier the same way (the dashboard's supplier health).
import { Badge } from '@/components/ui';
import { STATE_BADGE, supplierState } from '../lib/state';
import type { Supplier } from '../types';

export function SupplierStatusBadge({ supplier }: { supplier: Pick<Supplier, 'status' | 'health'> }) {
  const { label, tone, icon } = STATE_BADGE[supplierState(supplier)];
  return (
    <Badge tone={tone} icon={icon}>
      {label}
    </Badge>
  );
}
