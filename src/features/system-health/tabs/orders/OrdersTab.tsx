// OrdersTab: placeholder of the Orders & suppliers tab (order pipeline and supplier health) until its slice is built.
// The slice replaces this file; `index.ts` keeps exporting `OrdersTab` (a component without props).
import { TabPlaceholder } from '../TabPlaceholder';

/** The Orders & suppliers tab. */
export function OrdersTab() {
  return <TabPlaceholder name="Orders & suppliers" />;
}
