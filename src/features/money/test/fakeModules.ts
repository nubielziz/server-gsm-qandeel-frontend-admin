// A helper for the tests of the Money page's own parts: the real view modules with the two count hooks (and, when given, the Overview's
// figures) replaced, so a test can say what is waiting without a server. Import it from tests only.
import type { JSX } from 'react';
import { loadMoneyModules, type MoneyModules } from '../lib/modules';

/** What a test may set: the deposits waiting, the refunds and disputes waiting, and the two Overview figures. */
export type FakeOptions = {
  deposits?: number;
  refunds?: number;
  disputes?: number;
  financeOverview?: () => JSX.Element;
  refundsOverview?: () => JSX.Element;
};

/** The loaded modules with the fakes in place of the hooks. */
export async function fakeModules(options: FakeOptions = {}): Promise<MoneyModules> {
  const real = await loadMoneyModules();
  return {
    finance: {
      ...real.finance,
      useDepositsWaiting: () => options.deposits,
      ...(options.financeOverview ? { FinanceOverview: options.financeOverview } : {}),
    },
    refunds: {
      ...real.refunds,
      useMoneyBackWaiting: () => ({ refunds: options.refunds, disputes: options.disputes }),
      ...(options.refundsOverview ? { RefundsOverview: options.refundsOverview } : {}),
    },
  };
}
