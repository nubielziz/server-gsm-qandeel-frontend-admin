// The suppliers feature's dev mocks (`mocks: FeatureMocks`, found by src/mocks/handlers/index.ts): the supplier routes, the
// service list and import, the links and the API log, over tables seeded from the demo. Most specific routes first.
// The app's shared lookup mock still answers `GET /admin/suppliers` first until the lead removes it (see HANDOFF.md).
import type { FeatureMocks } from '@/mocks/featureMocks';
import { actionHandlers } from './actionRoutes';
import { catalogueHandlers } from './catalogueRoutes';
import { supplierHandlers } from './handlers';
import { logHandlers, resetLiveLog } from './logRoutes';
import { resetSuppliersState } from './store';

export { addCall, suppliersState } from './store';

/** The feature's mock routes and the reset that puts its tables back to the seed. */
export const mocks: FeatureMocks = {
  handlers: [...actionHandlers, ...catalogueHandlers, ...logHandlers, ...supplierHandlers],
  reset: () => {
    resetSuppliersState();
    resetLiveLog();
  },
};
