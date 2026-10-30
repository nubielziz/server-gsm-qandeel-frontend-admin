// The services feature's dev mocks (`mocks: FeatureMocks`, found by src/mocks/handlers/index.ts): the services, categories, pricing
// rules, price resolver, bulk price change and code inventory routes, seeded from the demo, plus the merchant group list the pricing
// screens read. Deletable with the rest of the mock layer; the feature's own code never imports it.
import type { FeatureMocks } from '@/mocks/featureMocks';
import { categoryRoutes } from './categoryRoutes';
import { inventoryRoutes } from './inventoryRoutes';
import { pricingRoutes } from './pricingRoutes';
import { ruleRoutes } from './ruleRoutes';
import { servicePartRoutes } from './servicePartRoutes';
import { serviceRoutes } from './serviceRoutes';
import { resetServicesStore } from './store';

/** What the mock layer finds: the routes and how to reset them. */
export const mocks: FeatureMocks = {
  // The bulk-price and resolve routes first: `/admin/services/:id` would otherwise be tried for them.
  handlers: [
    ...pricingRoutes,
    ...servicePartRoutes,
    ...inventoryRoutes,
    ...serviceRoutes,
    ...ruleRoutes,
    ...categoryRoutes,
  ],
  reset: resetServicesStore,
};
