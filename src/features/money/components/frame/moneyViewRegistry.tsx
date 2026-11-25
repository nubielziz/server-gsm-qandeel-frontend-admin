// The registry of the Money page: which component draws each view. The views come from the finance and refunds features (loaded by
// lib/modules.ts); only the Overview is the money feature's own. The rules of who may use a view are in lib/moneyViews.ts.
import type { ReactElement } from 'react';
import type { MoneyViewId, MoneyViewSpec } from '../../lib/moneyViews';
import type { MoneyModules } from '../../lib/modules';
import { OverviewView } from '../overview/OverviewView';

/** What a view may need to draw itself. */
export type MoneyViewContext = { modules: MoneyModules; usable: readonly MoneyViewSpec[] };

// One entry per view id: the type makes a missing view a compile error.
const VIEWS: Record<MoneyViewId, (context: MoneyViewContext) => ReactElement> = {
  overview: ({ modules, usable }) => <OverviewView modules={modules} usable={usable} />,
  deposits: ({ modules }) => <modules.finance.DepositsView />,
  'shop-payments': ({ modules }) => <modules.refunds.ShopPaymentsView />,
  refunds: ({ modules }) => <modules.refunds.RefundsView />,
  disputes: ({ modules }) => <modules.refunds.DisputesView />,
  ledger: ({ modules }) => <modules.finance.LedgerView />,
  'trial-balance': ({ modules }) => <modules.finance.TrialBalanceView />,
  'store-balances': ({ modules }) => <modules.finance.StoreBalancesView />,
  invoices: ({ modules }) => <modules.finance.InvoicesView />,
  'issue-invoice': ({ modules }) => <modules.finance.IssueInvoiceView />,
  profit: ({ modules }) => <modules.finance.ProfitView />,
  exposure: ({ modules }) => <modules.finance.ExposureView />,
  vat: ({ modules }) => <modules.finance.VatView />,
  funnel: ({ modules }) => <modules.finance.FunnelView />,
};

/** The view with this id, ready to draw. The page keys it by id, so a new view starts with fresh state (what it keeps lives in the address). */
export function renderMoneyView(id: MoneyViewId, context: MoneyViewContext): ReactElement {
  return VIEWS[id](context);
}
