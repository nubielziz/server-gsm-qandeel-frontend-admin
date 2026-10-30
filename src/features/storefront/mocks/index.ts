// The storefront feature's dev mocks (`mocks: FeatureMocks`, found by src/mocks/handlers/index.ts): the listing, content page, help
// article, legal document and TAC catalogue routes, seeded from the demo. Deletable with the rest of the mock layer; the feature's
// own code never imports it.
import type { FeatureMocks } from '@/mocks/featureMocks';
import { helpRoutes } from './helpRoutes';
import { legalRoutes } from './legalRoutes';
import { listingRoutes } from './listingRoutes';
import { pageRoutes } from './pageRoutes';
import { resetStorefrontStore } from './store';
import { tacRoutes } from './tacRoutes';

/** What the mock layer finds: the routes and how to reset them. */
export const mocks: FeatureMocks = {
  // Each file lists its specific routes (`generate`, `:id/publish`) before the generic ones.
  handlers: [...listingRoutes, ...pageRoutes, ...helpRoutes, ...legalRoutes, ...tacRoutes],
  reset: resetStorefrontStore,
};
