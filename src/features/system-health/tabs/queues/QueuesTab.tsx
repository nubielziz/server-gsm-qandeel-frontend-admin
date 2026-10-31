// QueuesTab: placeholder of the Queues & jobs tab (queues, failed jobs, scheduled jobs, webhooks) until its slice is built.
// The slice replaces this file; `index.ts` keeps exporting `QueuesTab` (a component without props).
import { TabPlaceholder } from '../TabPlaceholder';

/** The Queues & jobs tab. */
export function QueuesTab() {
  return <TabPlaceholder name="Queues & jobs" />;
}
