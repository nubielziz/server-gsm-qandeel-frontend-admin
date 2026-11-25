// StoreBalancesView: Books › Store balances: every account's store balance (the old Store balances tab) in a panel.
import { Panel } from '@/components/ui';
import { useFinanceGrants } from '../../hooks/useFinanceGrants';
import { WalletsTab } from '../WalletsTab';

/** The store balances list. It needs `wallet:read`; the page shows it only then. */
export function StoreBalancesView() {
  const grants = useFinanceGrants();
  return (
    <Panel flush>
      <WalletsTab grants={grants} />
    </Panel>
  );
}
