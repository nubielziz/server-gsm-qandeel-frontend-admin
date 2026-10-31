// StoresTab: placeholder of the Data stores tab (Postgres and Redis) until its slice is built.
// The slice replaces this file; `index.ts` keeps exporting `StoresTab` (a component without props).
import { TabPlaceholder } from '../TabPlaceholder';

/** The Data stores tab. */
export function StoresTab() {
  return <TabPlaceholder name="Data stores" />;
}
