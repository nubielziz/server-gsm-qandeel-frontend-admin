// Public surface of the finance feature: the ledger, payments, invoices and reports API functions and types, the registry, the
// palette source, `financePath` and friends for links into its views on the Money page, `PaymentStatusBadge` and `JournalLines`.
// The views themselves load lazily through `loadFinanceViews` (decision 026).
export * from './api';
export * from './components/JournalLines';
export * from './components/PaymentStatusBadge';
export * from './lib/kinds';
export * from './lib/paletteSource';
export { methodLabel, paymentLabel } from './lib/payments';
export {
  financeInvoicePath,
  financeJournalPath,
  financePath,
  financePaymentPath,
  type FinanceTab,
} from './lib/tabs';
export * from './types';

/**
 * The finance views of the Money page (decision 026), loaded on demand. A dynamic import, so this index stays free of components: the
 * accounts and orders features import it, and the views import the accounts feature back.
 */
export const loadFinanceViews = () => import('./views');
