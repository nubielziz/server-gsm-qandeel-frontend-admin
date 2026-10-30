// The commissions feature's dev mocks (`mocks: FeatureMocks`, found by src/mocks/handlers/index.ts): the plan, assignment and accrual
// routes, seeded from the demo (`S.plans`, `S.accruals` and the agents among `S.merchants`). Deletable with the rest of the mock layer;
// the feature's own code never imports it.
import type { FeatureMocks } from '@/mocks/featureMocks';
import { accrualRoutes } from './accrualRoutes';
import { assignmentRoutes } from './assignmentRoutes';
import { planRoutes } from './planRoutes';
import { resetCommissionsStore } from './store';

/** What the mock layer finds: the routes and how to reset them. */
export const mocks: FeatureMocks = {
  handlers: [...accrualRoutes, ...assignmentRoutes, ...planRoutes],
  reset: resetCommissionsStore,
};
