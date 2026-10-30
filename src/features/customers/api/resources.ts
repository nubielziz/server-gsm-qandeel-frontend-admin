// Registers the CRUD resources of the customers feature for Refine's data hooks (decision 005). The data provider calls these
// same typed functions, so the list, the detail and the edits have one code path. `app/resources.ts` merges the registry.
import type { ResourceRegistry } from '@/lib/api';
import { createCustomer, getCustomer, listCustomers, updateCustomer } from './customers';
import { getDataRequest, listDataRequests, updateDataRequest } from './dataRequests';

/** Customers have no delete (they are anonymised), and data requests are made by customers, so staff cannot create them. */
export const customersResources: ResourceRegistry = {
  customers: { list: listCustomers, show: getCustomer, create: createCustomer, update: updateCustomer },
  'data-requests': { list: listDataRequests, show: getDataRequest, update: updateDataRequest },
};
