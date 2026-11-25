// TrialBalanceView: Books › Trial balance: the balances beside the integrity checks (the old Trial balance tab) in a panel.
import { Panel } from '@/components/ui';
import { TrialBalanceTab } from '../TrialBalanceTab';

/** The trial balance. It needs `ledger:read`; the page shows it only then. */
export function TrialBalanceView() {
  return (
    <Panel flush>
      <TrialBalanceTab />
    </Panel>
  );
}
