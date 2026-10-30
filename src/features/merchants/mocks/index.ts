// The merchants feature's dev mocks (decision 014): the routes for merchants, wallets, groups, client prices, verification requests
// and API keys, taken from the demo seed. `src/mocks/handlers` finds this file on its own. The "Add override" menu also reads
// `GET /admin/services`, which the services feature mocks; the tests of this feature answer it themselves.
import type { FeatureMocks } from '@/mocks/featureMocks';
import { clientRoutes } from './clientRoutes';
import { groupRoutes } from './groupRoutes';
import { kycRoutes } from './kycRoutes';
import { priceRoutes } from './priceRoutes';
import { resetMerchantStore } from './store';
import { walletRoutes } from './walletRoutes';

export const mocks: FeatureMocks = {
  // The wallet routes come before the account routes: `/admin/clients/:id` must not answer `/admin/clients/:id/wallet`.
  handlers: [...walletRoutes, ...kycRoutes, ...clientRoutes, ...groupRoutes, ...priceRoutes],
  reset: resetMerchantStore,
};
