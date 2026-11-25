// LedgerView: Books › Ledger: the journal list (the old Ledger tab) in a panel directly under the page's links.
import { Panel } from '@/components/ui';
import { LedgerTab } from '../LedgerTab';

/** The journal entries with their filters and drawer. It needs `ledger:read`; the page shows it only then. */
export function LedgerView() {
  return (
    <Panel flush>
      <LedgerTab />
    </Panel>
  );
}
