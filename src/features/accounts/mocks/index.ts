// The accounts feature's dev mocks (decision 014): the routes of the one accounts table (`/admin/clients*`), the ranks, the fixed prices,
// the API keys and the data requests, taken from the demo seed (its merchants and its customers as one list), and the 410 of the retired
// `/admin/customers*` routes. `src/mocks/handlers` finds this file on its own; feature code never imports it.
import type { FeatureMocks } from '@/mocks/featureMocks';
import { accountRoutes } from './accountRoutes';
import { apiKeyRoutes } from './apiKeyRoutes';
import { priceRoutes } from './priceRoutes';
import { privacyRoutes } from './privacyRoutes';
import { rankChangeRoute } from './rankChangeRoute';
import { rankRoutes } from './rankRoutes';
import { requestRoutes } from './requestRoutes';
import { retiredRoutes } from './retiredRoutes';
import { securityRoutes } from './securityRoutes';
import { resetAccountStore } from './store';
import { walletRoutes } from './walletRoutes';
import { resetWalletStore } from './walletStore';

export const mocks: FeatureMocks = {
  // The routes with more segments or a fixed word (`/counts`, `/:id/wallet`, `/:id/rank`) come before `/admin/clients/:id`, which would
  // otherwise answer them.
  handlers: [
    ...walletRoutes,
    ...securityRoutes,
    ...privacyRoutes,
    ...rankChangeRoute,
    ...apiKeyRoutes,
    ...accountRoutes,
    ...rankRoutes,
    ...priceRoutes,
    ...requestRoutes,
    ...retiredRoutes,
  ],
  reset: () => {
    resetAccountStore();
    resetWalletStore();
  },
};

// What the finance mocks read to list store balances and top-ups and to credit an approved one.
export { accountTopUps, creditTopUp, markTopUp, storeBalanceRows, type MockTopUp } from './walletStore';
export { walletOfAccount } from './dto';
