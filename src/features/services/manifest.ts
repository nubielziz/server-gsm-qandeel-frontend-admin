// How the services feature plugs into the app (src/app/features.ts finds this file): the Services & pricing page with its any-tab
// permission, its Refine resources and the palette's service search.
import type { FeatureManifest } from '@/app/featureManifest';
import { servicesResources } from './api/resources';
import { servicesPaletteSource } from './lib/paletteSource';
import { PAGE_PERMISSIONS } from './lib/tabs';

export const manifest: FeatureManifest = {
  id: 'services',
  page: {
    name: 'services',
    heading: 'Services & pricing',
    list: () => import('./pages').then((pages) => pages.ServicesPage),
    // Any tab's read permission opens the page; each tab then shows only what the role may read (the access page works the same way).
    permission: PAGE_PERMISSIONS,
  },
  registry: servicesResources,
  palette: [servicesPaletteSource],
};
