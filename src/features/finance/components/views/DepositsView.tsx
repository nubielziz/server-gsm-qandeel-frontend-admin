// DepositsView: Money in › Deposits: the deposit review queue (the old Deposits tab) in a panel directly under the page's links.
import { Panel } from '@/components/ui';
import { useFinanceGrants } from '../../hooks/useFinanceGrants';
import { DepositsTab } from '../DepositsTab';

/** The Pending / Approved / Rejected / All queue with its table and review dialog. It needs `payments:read`; the page shows it only then. */
export function DepositsView() {
  const grants = useFinanceGrants();
  return (
    <Panel flush>
      <DepositsTab grants={grants} />
    </Panel>
  );
}
