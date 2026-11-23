// BulkSummaryDialog: what a bulk action did when some orders were refused: how many went through, and for each of the others
// which order it was and the server's reason. The demo's bulk actions could not fail, so it has no such dialog; the API
// checks every order again (MISMATCHES M23). The dialog itself is the kit's; this adds the word "orders".
import { BulkSummaryDialog as SummaryDialog, type BulkSummary } from '@/components/ui';

const ORDERS = { one: 'order', many: 'orders' };

/** The summary of a bulk action over orders. */
export function BulkSummaryDialog({ summary, onClose }: { summary: BulkSummary; onClose: () => void }) {
  return <SummaryDialog summary={summary} onClose={onClose} unit={ORDERS} />;
}
