// The figures of the strip under the page title: Bank, Merchant wallets, Held in open orders, Supplier prepaid and the
// deposits waiting for review. Ports finStrip (45-p-finance.js). The demo added them up from its in-memory books; here each
// comes from the server: the trial balance, the wallet exposure report and the pending-deposit count.
import type { FinanceGrants } from './useFinanceGrants';
import { usePendingDeposits } from './usePaymentCounts';
import { useWalletExposure } from './useReports';
import { useTrialBalance } from './useTrialBalance';

/**
 * Each figure reads its own route and only with the permission it needs (`ledger:read`, `reports:read`, `payments:read`).
 * A source the staff member may not read is `enabled: false`, and the strip leaves its cells out.
 */
export function useFinanceStrip(grants: FinanceGrants) {
  const canLedger = grants.ready && grants.can('ledger:read');
  const canReports = grants.ready && grants.can('reports:read');
  const canPayments = grants.ready && grants.can('payments:read');

  return {
    canLedger,
    canReports,
    canPayments,
    trial: useTrialBalance(canLedger),
    exposure: useWalletExposure(canReports),
    pending: usePendingDeposits(canPayments),
  };
}

export type FinanceStrip = ReturnType<typeof useFinanceStrip>;
