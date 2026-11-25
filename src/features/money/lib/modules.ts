// The two view modules the Money page draws (the finance views and the refunds views), loaded once, on the first visit to the page.
// They are lazy on purpose: the accounts and orders features import the finance index, and the views import them back (see views.ts).
import { loadFinanceViews } from '@/features/finance';
import { loadRefundViews } from '@/features/refunds';

/** The components and count hooks of the two features, as the Money page uses them. */
export type MoneyModules = {
  finance: Awaited<ReturnType<typeof loadFinanceViews>>;
  refunds: Awaited<ReturnType<typeof loadRefundViews>>;
};

let loading: Promise<MoneyModules> | undefined;

/**
 * Loads both view modules once and gives every caller the same promise, so React's `use()` can read it on every render. A failed load is
 * forgotten, so the next visit tries again instead of showing the old failure for good.
 */
export function loadMoneyModules(): Promise<MoneyModules> {
  if (loading) return loading;
  const attempt = Promise.all([loadFinanceViews(), loadRefundViews()])
    .then(([finance, refunds]) => ({ finance, refunds }))
    .catch((error: unknown) => {
      if (loading === attempt) loading = undefined;
      throw error;
    });
  loading = attempt;
  return attempt;
}
