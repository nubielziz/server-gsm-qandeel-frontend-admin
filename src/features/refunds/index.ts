// Public surface of the refunds feature: the `/admin/refunds*`, `/admin/disputes*` and `/admin/reports/payments` API functions,
// their types, the data-provider registry, and `refundsPath` for links into its views on the Money page (`/money?view=disputes`,
// `/money?view=refunds&status=requested`). The views themselves load lazily through `loadRefundViews` (decision 026).
export * from './api';
export { refundsPath, type RefundTab, type RefundView } from './lib/view';
export { disputeLabel, refundLabel } from './lib/labels';
export * from './types';

/** The refunds views of the Money page (decision 026), loaded on demand, so this index stays free of components. */
export const loadRefundViews = () => import('./views');
