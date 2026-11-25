// OverviewView: the Overview of the Money page: the five Finance figures with "Run reconciliation" (finance), the four refund and
// dispute figures (refunds), and a short list of what waits for a person. The figures are the two features' own components.
import type { MoneyViewSpec } from '../../lib/moneyViews';
import type { MoneyModules } from '../../lib/modules';
import { WaitingPanel } from './WaitingPanel';

export interface OverviewViewProps {
  usable: readonly MoneyViewSpec[];
  modules: MoneyModules;
}

/** Each part leaves itself out for a role that may not read what it shows, so the Overview is whatever the role may see. */
export function OverviewView({ usable, modules }: OverviewViewProps) {
  const { FinanceOverview } = modules.finance;
  const { RefundsOverview } = modules.refunds;
  return (
    <div className="flex flex-col gap-4">
      <FinanceOverview />
      <RefundsOverview />
      <WaitingPanel usable={usable} modules={modules} />
    </div>
  );
}
