// How the storefront feature plugs into the app (src/app/features.ts finds this file): the Storefront page with its any-tab
// permission and its Refine resources. It has no palette source: the demo's palette did not search the storefront.
import type { FeatureManifest } from '@/app/featureManifest';
import { storefrontResources } from './api/resources';
import { PAGE_PERMISSIONS } from './lib/tabs';

export const manifest: FeatureManifest = {
  id: 'storefront',
  page: {
    name: 'storefront',
    heading: 'Storefront',
    list: () => import('./pages').then((pages) => pages.StorefrontPage),
    // Any tab's read permission opens the page; each tab then shows only what the role may read (the services page works the same way).
    permission: PAGE_PERMISSIONS,
  },
  registry: storefrontResources,
};
