// The views the Money page shows from the finance feature (decision 026). The page loads this module lazily through `loadFinanceViews`
// (index.ts), so the features that import the finance index (accounts, orders, system health) never pull these components in.
// Every export is a view with no props: it reads its own permissions (useFinanceGrants) and keeps its choices in the address.

/** Overview: the five Finance figures and "Run reconciliation" with its answer. */
export { FinanceOverview } from './components/views/FinanceOverview';

/** Money in › Deposits: the deposit review queue (the old Deposits tab). */
export { DepositsView } from './components/views/DepositsView';

/** Books › Ledger. */
export { LedgerView } from './components/views/LedgerView';

/** Books › Trial balance, beside the integrity checks. */
export { TrialBalanceView } from './components/views/TrialBalanceView';

/** Books › Store balances. */
export { StoreBalancesView } from './components/views/StoreBalancesView';

/** Books › Invoices. */
export { InvoicesView } from './components/views/InvoicesView';

/** Books › +Issue invoice: the manual invoice form as a full view. */
export { IssueInvoiceView } from './components/issue/IssueInvoiceView';

/** Reports › Profit, Wallet exposure, VAT and Sales funnel. */
export { ExposureView, FunnelView, ProfitView, VatView } from './components/views/ReportViews';

/** Deposits waiting for review (the count of Money in and of Deposits); undefined while unknown or without `payments:read`. */
export { useDepositsWaiting } from './hooks/useDepositsWaiting';
