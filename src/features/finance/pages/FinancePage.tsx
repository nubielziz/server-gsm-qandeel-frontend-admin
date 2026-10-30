// FinancePage: the Finance page (`/finance`, the demo's `pageFinance` in 45-p-finance.js). A header with the deposits waiting
// and Run reconciliation, the strip of key figures, and tabs: Ledger, Deposits, Trial balance, Invoices and Reports. The tab
// and each tab's filters, page and open record live in the address. The page only composes; the server owns every figure.
import { useState } from 'react';
import { Panel, SectionTabs, type TabItem } from '@/components/ui';
import { DepositsTab } from '../components/DepositsTab';
import { FinanceHeader } from '../components/FinanceHeader';
import { FinanceStrip } from '../components/FinanceStrip';
import { InvoicesTab } from '../components/InvoicesTab';
import { LedgerTab } from '../components/LedgerTab';
import { ReconcileDialog } from '../components/ReconcileDialog';
import { ReportsTab } from '../components/ReportsTab';
import { TrialBalanceTab } from '../components/TrialBalanceTab';
import { useFinanceGrants } from '../hooks/useFinanceGrants';
import { useFinanceStrip } from '../hooks/useFinanceStrip';
import { useFinanceTab } from '../hooks/useFinanceTab';
import { useReconcile } from '../hooks/useReconcile';
import type { FinanceTab } from '../lib/tabs';
import type { ReconcileResult } from '../types';

export function FinancePage() {
  const grants = useFinanceGrants();
  const { tab, tabs, setTab } = useFinanceTab(grants.permissions);
  const strip = useFinanceStrip(grants);
  const reconcile = useReconcile();
  const [result, setResult] = useState<ReconcileResult | null>(null);

  // The Deposits tab carries the number of deposits waiting, as the demo's does.
  const tabItems: TabItem<FinanceTab>[] = tabs.map((item) => ({
    value: item.id,
    label: item.label,
    count: item.id === 'payments' && strip.pending.data ? strip.pending.data : null,
  }));

  return (
    <>
      <FinanceHeader
        grants={grants}
        pending={strip.pending.data}
        reconciling={reconcile.isPending}
        onReconcile={() => reconcile.mutate(undefined, { onSuccess: setResult })}
      />
      <FinanceStrip strip={strip} />
      <Panel flush>
        {tab && <SectionTabs items={tabItems} value={tab} onChange={setTab} label="Finance sections" />}
        {tab === 'ledger' && <LedgerTab />}
        {tab === 'payments' && <DepositsTab grants={grants} />}
        {tab === 'accounts' && <TrialBalanceTab />}
        {tab === 'invoices' && <InvoicesTab grants={grants} />}
        {tab === 'reports' && <ReportsTab grants={grants} />}
      </Panel>
      {result && <ReconcileDialog result={result} onClose={() => setResult(null)} />}
    </>
  );
}
