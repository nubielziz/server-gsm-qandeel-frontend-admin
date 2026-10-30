// Registers the CRUD resources of the merchants feature for Refine's data hooks (decision 005). The data provider calls these
// same typed functions, so lists and single records have one code path. `app/resources.ts` merges the registry.
import type { ResourceRegistry } from '@/lib/api';
import { createClient, getClient, listClients, updateClient } from './clients';
import {
  createClientGroup,
  deleteClientGroup,
  getClientGroup,
  listClientGroups,
  updateClientGroup,
} from './groups';
import { getKycSubmission, listKycSubmissions } from './kyc';
import { createClientPrice, deleteClientPrice, listClientPrices, updateClientPrice } from './prices';

/**
 * Each resource lists only the operations its endpoints offer: merchants cannot be deleted (they are suspended), client
 * prices have no show route, and verification requests are only read here (a decision is an action endpoint).
 */
export const merchantsResources: ResourceRegistry = {
  clients: { list: listClients, show: getClient, create: createClient, update: updateClient },
  'client-groups': {
    list: listClientGroups,
    show: getClientGroup,
    create: createClientGroup,
    update: updateClientGroup,
    delete: deleteClientGroup,
  },
  'client-prices': {
    list: listClientPrices,
    create: createClientPrice,
    update: updateClientPrice,
    delete: deleteClientPrice,
  },
  'kyc-submissions': { list: listKycSubmissions, show: getKycSubmission },
};
