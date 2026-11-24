// Registers the CRUD resources of the accounts feature for Refine's data hooks (decision 005). The data provider calls these same typed
// functions, so lists and single records have one code path. `app/resources.ts` merges the registry. The resource names are the API
// path segments, so `clients` stays the name of the one accounts table.
import type { ResourceRegistry } from '@/lib/api';
import { createAccount, getAccount, listAccounts, updateAccount } from './accounts';
import { createAccountPrice, deleteAccountPrice, listAccountPrices, updateAccountPrice } from './prices';
import { getDataRequest, listDataRequests, updateDataRequest } from './dataRequests';
import { createRank, deleteRank, getRank, listRanks, updateRank } from './ranks';

/**
 * Each resource lists only the operations its endpoints offer: accounts cannot be deleted (they are suspended, blocked or
 * anonymized), fixed prices have no show route, and data requests are made by accounts, so staff cannot create them.
 */
export const accountsResources: ResourceRegistry = {
  clients: { list: listAccounts, show: getAccount, create: createAccount, update: updateAccount },
  'client-groups': {
    list: listRanks,
    show: getRank,
    create: createRank,
    update: updateRank,
    delete: deleteRank,
  },
  'client-prices': {
    list: listAccountPrices,
    create: createAccountPrice,
    update: updateAccountPrice,
    delete: deleteAccountPrice,
  },
  'data-requests': { list: listDataRequests, show: getDataRequest, update: updateDataRequest },
};
