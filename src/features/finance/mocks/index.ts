// The finance feature's dev mocks (decision 014): deposits, invoices, the trial balance with reconciliation, and the reports.
// The ledger entries themselves are served by the shared mock (`src/mocks/handlers/ledger.ts`); see HANDOFF.md.
import type { FeatureMocks } from '@/mocks/featureMocks';
import { accountHandlers } from './accountHandlers';
import { invoiceHandlers } from './invoiceHandlers';
import { resetInvoiceStore } from './invoices';
import { paymentHandlers } from './paymentHandlers';
import { resetPaymentStore } from './paymentStore';
import { reportHandlers } from './reports';

export const mocks: FeatureMocks = {
  handlers: [...paymentHandlers, ...invoiceHandlers, ...accountHandlers, ...reportHandlers],
  reset: () => {
    resetPaymentStore();
    resetInvoiceStore();
  },
};
