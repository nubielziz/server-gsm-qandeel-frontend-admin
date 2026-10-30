// Public surface of the finance feature: the ledger, payments, invoices and reports API functions and types, the registry, the
// palette source, `financePath` and friends for links into the Finance page, `PaymentStatusBadge` and `JournalLines`. The page
// itself loads lazily from `./pages`.
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
