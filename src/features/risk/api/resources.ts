// Registers the CRUD resources of the risk feature for Refine's data hooks (decision 005): the IMEI check log and the
// blocklist. The data provider calls these same typed functions. `app/resources.ts` merges the registry.
import type { ResourceRegistry } from '@/lib/api';
import { createBlocklistEntry, deleteBlocklistEntry, getBlocklistEntry, listBlocklist } from './blocklist';
import { getImeiCheck, listImeiChecks } from './imeiChecks';

/** The check log is read only; the blocklist can be listed, read, added to and removed from (no edits). */
export const riskResources: ResourceRegistry = {
  'imei-checks': { list: listImeiChecks, show: getImeiCheck },
  blocklist: {
    list: listBlocklist,
    show: getBlocklistEntry,
    create: createBlocklistEntry,
    delete: deleteBlocklistEntry,
  },
};
