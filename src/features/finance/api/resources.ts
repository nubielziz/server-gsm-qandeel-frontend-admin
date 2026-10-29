// Registers the CRUD resources of the finance feature for Refine's data hooks (decision 005). Only the ledger exists so
// far; the finance page adds the rest. `app/resources.ts` merges the registry.
import type { ResourceRegistry } from '@/lib/api';
import { getLedgerTransaction, listLedgerTransactions } from './ledger';

/** Journal entries are read-only: the ledger is append only, a mistake is fixed with a new entry. */
export const financeResources: ResourceRegistry = {
  'ledger/transactions': { list: listLedgerTransactions, show: getLedgerTransaction },
};
