// AlertsTab: placeholder of the Alerts & incidents tab (alerts, alert rules, incidents) until its slice is built.
// The slice replaces this file; `index.ts` keeps exporting `AlertsTab` (a component without props).
import { TabPlaceholder } from '../TabPlaceholder';

/** The Alerts & incidents tab. */
export function AlertsTab() {
  return <TabPlaceholder name="Alerts & incidents" />;
}
