// Registers the CRUD resources of the refunds feature for Refine's data hooks (decision 005). The data provider calls these
// same typed functions, so a list and a single record have one code path. `app/resources.ts` merges the registry.
import type { ResourceRegistry } from '@/lib/api';
import { getDispute, listDisputes } from './disputes';
import { getRefund, listRefunds } from './refunds';

/** Refunds and disputes can be listed and read; every change is an action endpoint, never a plain create or update. */
export const refundsResources: ResourceRegistry = {
  refunds: { list: listRefunds, show: getRefund },
  disputes: { list: listDisputes, show: getDispute },
};
