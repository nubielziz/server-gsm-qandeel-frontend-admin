// Registers the CRUD resource of the risk feature for Refine's data hooks (decision 005): the blocklist. The data provider
// calls these same typed functions. `app/resources.ts` merges the registry.
import type { ResourceRegistry } from '@/lib/api';
import { createBlocklistEntry, deleteBlocklistEntry, getBlocklistEntry, listBlocklist } from './blocklist';

/** The blocklist can be listed, read, added to and removed from (no edits). */
export const riskResources: ResourceRegistry = {
  blocklist: {
    list: listBlocklist,
    show: getBlocklistEntry,
    create: createBlocklistEntry,
    delete: deleteBlocklistEntry,
  },
};
