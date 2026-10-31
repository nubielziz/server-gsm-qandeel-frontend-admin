// IntegrityTab: placeholder of the Integrity tab (the four ledger checks) until its slice is built.
// The slice replaces this file; `index.ts` keeps exporting `IntegrityTab` (a component without props).
import { TabPlaceholder } from '../TabPlaceholder';

/** The Integrity tab. */
export function IntegrityTab() {
  return <TabPlaceholder name="Integrity" />;
}
