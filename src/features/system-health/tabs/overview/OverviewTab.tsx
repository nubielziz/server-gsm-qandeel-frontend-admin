// OverviewTab: placeholder of the Overview tab (components, response time, open alerts, ongoing incidents, build) until its slice is built.
// The slice replaces this file; `index.ts` keeps exporting `OverviewTab` (a component without props).
import { TabPlaceholder } from '../TabPlaceholder';

/** The Overview tab. */
export function OverviewTab() {
  return <TabPlaceholder name="Overview" />;
}
