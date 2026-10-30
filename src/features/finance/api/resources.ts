// Registers the CRUD resources of the finance feature for Refine's data hooks (decision 005): the ledger entries, the
// payments and the invoices. The data provider calls these same typed functions. `app/resources.ts` merges the registry.
import type { ResourceRegistry } from '@/lib/api';
import { createInvoice, getInvoice, listInvoices } from './invoices';
import { getLedgerTransaction, listLedgerTransactions } from './ledger';
import { getPayment, listPayments } from './payments';

/**
 * Journal entries are read-only: the ledger is append only, a mistake is fixed with a new entry. Payments are read
 * here and decided through the approve and reject actions. Invoices can be listed, read and issued.
 */
export const financeResources: ResourceRegistry = {
  'ledger/transactions': { list: listLedgerTransactions, show: getLedgerTransaction },
  payments: { list: listPayments, show: getPayment },
  invoices: { list: listInvoices, show: getInvoice, create: createInvoice },
};
