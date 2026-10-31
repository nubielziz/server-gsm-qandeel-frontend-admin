// ApiTab: placeholder of the API tab (surfaces, latency and 5xx charts, slowest endpoints, top errors) until its slice is built.
// The slice replaces this file; `index.ts` keeps exporting `ApiTab` (a component without props).
import { TabPlaceholder } from '../TabPlaceholder';

/** The API tab. */
export function ApiTab() {
  return <TabPlaceholder name="API" />;
}
