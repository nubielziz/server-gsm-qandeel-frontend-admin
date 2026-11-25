// InvoicesView: Books › Invoices: the invoice list (the old Invoices tab) in a panel. Issuing one is its own view (+Issue invoice).
import { Panel } from '@/components/ui';
import { useFinanceGrants } from '../../hooks/useFinanceGrants';
import { InvoicesTab } from '../InvoicesTab';

/** The invoices with their filters and drawer. It needs `invoices:read`; the page shows it only then. */
export function InvoicesView() {
  const grants = useFinanceGrants();
  return (
    <Panel flush>
      <InvoicesTab grants={grants} />
    </Panel>
  );
}
