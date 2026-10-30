// Registers the CRUD resources of the commissions feature for Refine's data hooks (decision 005). The data provider calls these
// same typed functions, so the lists and the single records have one code path. `app/resources.ts` merges the registry.
import type { ResourceRegistry } from '@/lib/api';
import { getAccrual, listAccruals } from './accruals';
import {
  createAssignment,
  deleteAssignment,
  getAssignment,
  listAssignments,
  updateAssignment,
} from './assignments';
import { createPlan, deletePlan, getPlan, listPlans, updatePlan } from './plans';

/** Each resource lists only the operations its endpoints offer: the accruals can be listed and read, nothing else. */
export const commissionsResources: ResourceRegistry = {
  'commission-plans': {
    list: listPlans,
    show: getPlan,
    create: createPlan,
    update: updatePlan,
    delete: deletePlan,
  },
  'commission-assignments': {
    list: listAssignments,
    show: getAssignment,
    create: createAssignment,
    update: updateAssignment,
    delete: deleteAssignment,
  },
  'commission-accruals': { list: listAccruals, show: getAccrual },
};
