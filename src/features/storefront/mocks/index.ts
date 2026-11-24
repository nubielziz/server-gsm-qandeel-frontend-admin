// The storefront feature's dev mocks (`mocks: FeatureMocks`, found by src/mocks/handlers/index.ts): the listing, publish run, retail pricing, content page, help
// article, legal document and Search tab routes, seeded from the demo. Deletable with the rest of the mock layer; the feature's
// own code never imports it.
import type { FeatureMocks } from '@/mocks/featureMocks';
import { helpRoutes } from './helpRoutes';
import { legalRoutes } from './legalRoutes';
import { listingRoutes } from './listingRoutes';
import { pageRoutes } from './pageRoutes';
import { searchRoutes } from './searchRoutes';
import { publishRoutes } from './publishRoutes';
import { retailPricingRoutes } from './retailPricingRoutes';
import { resetStorefrontStore } from './store';

export { shopFactsReader, type MockPublishFailure, type ShopFacts } from './shopFacts';
export { anyRetailRuleActive, handOverQuickAdd } from './publishQuickAdd';

/** What the mock layer finds: the routes and how to reset them. */
export const mocks: FeatureMocks = {
  // Each file lists its specific routes (`:id/publish`) before the generic ones.
  handlers: [
    ...listingRoutes,
    ...publishRoutes,
    ...retailPricingRoutes,
    ...pageRoutes,
    ...helpRoutes,
    ...legalRoutes,
    ...searchRoutes,
  ],
  reset: resetStorefrontStore,
};
