// The dashboard's dev mocks. `src/mocks/handlers/index.ts` finds this file on its own (ARCHITECTURE.md §5, step 7).
import type { FeatureMocks } from '@/mocks/featureMocks';
import { dashboardHandlers } from './handlers';
import { resetWorld } from './world';

export const mocks: FeatureMocks = {
  handlers: dashboardHandlers,
  reset: resetWorld,
};
