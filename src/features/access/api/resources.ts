// Registers the CRUD resources of this feature for Refine's data hooks (decision 005). The data provider calls these
// same typed functions, so list/show/create/update/delete have one code path. `app/resources.ts` merges the registry.
import type { ResourceRegistry } from '@/lib/api';
import { createIpRule, deleteIpRule, getIpRule, listIpRules } from './ipRules';
import { createRole, deleteRole, getRole, listRoles, updateRole } from './roles';
import { createStaff, getStaff, listStaff, updateStaff } from './staff';

/** Each resource lists only the operations its endpoints offer: staff has no delete, IP rules cannot be edited. */
export const accessResources: ResourceRegistry = {
  staff: { list: listStaff, show: getStaff, create: createStaff, update: updateStaff },
  'ip-rules': { list: listIpRules, show: getIpRule, create: createIpRule, delete: deleteIpRule },
  roles: { list: listRoles, show: getRole, create: createRole, update: updateRole, delete: deleteRole },
};
