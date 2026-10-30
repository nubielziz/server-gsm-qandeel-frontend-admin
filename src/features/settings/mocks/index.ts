// The settings feature's dev mocks (`mocks: FeatureMocks`, found by src/mocks/handlers/index.ts): payment gateways, tax rates,
// currencies and the rate refresh, notification templates and their preview, the notification log, the webhook log with its retry, and
// the storefront policies. Seeded from the demo (the logs are made up). `GET` and `PATCH /admin/settings` stay in the shared mock.
// Deletable with the rest of the mock layer; the feature's own code never imports it.
import type { FeatureMocks } from '@/mocks/featureMocks';
import { currencyRoutes } from './currencyRoutes';
import { gatewayRoutes } from './gatewayRoutes';
import { logRoutes } from './logRoutes';
import { resetSettingsFeatureStore } from './store';
import { storefrontRoutes } from './storefrontRoutes';
import { taxRoutes } from './taxRoutes';
import { templateRoutes } from './templateRoutes';

/** What the mock layer finds: the routes and how to reset them. */
export const mocks: FeatureMocks = {
  handlers: [
    ...storefrontRoutes,
    ...currencyRoutes,
    ...gatewayRoutes,
    ...taxRoutes,
    ...templateRoutes,
    ...logRoutes,
  ],
  reset: resetSettingsFeatureStore,
};
