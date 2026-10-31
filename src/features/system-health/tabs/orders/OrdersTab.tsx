// OrdersTab: the Orders & suppliers tab of the System health page: the order pipeline and the health of each supplier, with
// Pause and Resume. Route group `health`: `GET /admin/system/orders-health`, `GET /admin/system/suppliers`.
import { PartBoundary } from '../../header/PartBoundary';
import { useOrdersHealth, useSuppliersHealth } from '../../hooks';
import { PipelineCard } from './PipelineCard';
import { SuppliersCard } from './SuppliersCard';

/**
 * The tab has no address parameters: everything here is "now", so `?range=` does not apply. Each card has its own read and
 * its own boundary, so one failing read, or one answer the console cannot draw, never blanks the other card. Both span
 * the 12-column grid because the supplier table needs the width. The span sits on a wrapper around the boundary, not on
 * the card: when a card cannot be drawn the boundary shows a plain note, and a note with no span of its own would be one
 * column wide (about 90px). `min-w-0` lets a wide table shrink inside the grid instead of stretching it.
 */
export function OrdersTab() {
  const orders = useOrdersHealth();
  const suppliers = useSuppliersHealth();
  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
      <div className="min-w-0 xl:col-span-12">
        <PartBoundary name="The order pipeline" resetKey={orders.dataUpdatedAt}>
          <PipelineCard query={orders} />
        </PartBoundary>
      </div>
      <div className="min-w-0 xl:col-span-12">
        <PartBoundary name="The suppliers" resetKey={suppliers.dataUpdatedAt}>
          <SuppliersCard query={suppliers} />
        </PartBoundary>
      </div>
    </div>
  );
}
