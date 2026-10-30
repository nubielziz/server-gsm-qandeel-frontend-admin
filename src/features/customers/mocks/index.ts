// The customers feature's dev mocks: the routes of `/admin/customers*` and `/admin/data-requests*`, and the reset that puts the
// stores back to their seed. `src/mocks/handlers/index.ts` finds this file on its own (decision 014); feature code never imports it.
import type { FeatureMocks } from '@/mocks/featureMocks';
import { actionHandlers } from './actionHandlers';
import { customerHandlers } from './customerHandlers';
import { requestHandlers } from './requestHandlers';
import { resetCustomerStore } from './store';

export const mocks: FeatureMocks = {
  // The action routes (`/:id/export`, `/:id/suspend`…) have more segments than `/:id`, so the order is free; they come first anyway.
  handlers: [...actionHandlers, ...customerHandlers, ...requestHandlers],
  reset: resetCustomerStore,
};
