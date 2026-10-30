// The checkouts feature's dev mocks (`mocks: FeatureMocks`, found by src/mocks/handlers/index.ts): the abandoned list, the recovery
// email and the funnel, over a table seeded from the demo.
import type { FeatureMocks } from '@/mocks/featureMocks';
import { checkoutHandlers } from './handlers';
import { resetCheckoutsState } from './store';

export { checkoutsState } from './store';

/** The feature's mock routes and the reset that puts its table back to the seed. */
export const mocks: FeatureMocks = {
  handlers: checkoutHandlers,
  reset: resetCheckoutsState,
};
