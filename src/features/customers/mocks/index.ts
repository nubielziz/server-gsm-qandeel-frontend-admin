// The customers feature's dev mocks: the routes of `/admin/customers*` and `/admin/data-requests*`, and the reset that puts the
// stores back to their seed. `src/mocks/handlers/index.ts` finds this file on its own (decision 014); feature code never imports it.
import type { FeatureMocks } from '@/mocks/featureMocks';
import { actionHandlers } from './actionHandlers';
import { customerHandlers } from './customerHandlers';
import { requestHandlers } from './requestHandlers';
import { resetCustomerStore } from './store';
import { walletHandlers } from './walletHandlers';
import { resetWalletStore } from './walletStore';

export const mocks: FeatureMocks = {
  // The action routes (`/:id/export`, `/:id/suspend`…) have more segments than `/:id`, so the order is free; they come first anyway.
  handlers: [...walletHandlers, ...actionHandlers, ...customerHandlers, ...requestHandlers],
  reset: () => {
    resetCustomerStore();
    resetWalletStore();
  },
};

// What the finance mocks read to list customer wallets and top-ups and to credit an approved one.
export { creditTopUp, customerTopUps, markTopUp, walletOf, walletRows, type MockTopUp } from './walletStore';
