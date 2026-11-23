// How the services feature plugs into the app (src/app/features.ts finds this file): the Product / Services page (`/products`) with its
// any-view permission, its Refine resources and the palette's service search. The feature's folder and names stay `services`.
import type { FeatureManifest } from '@/app/featureManifest';
import { servicesResources } from './api/resources';
import { servicesPaletteSource } from './lib/paletteSource';
import { PRODUCTS_HEADING, PRODUCTS_PAGE_PERMISSIONS } from './lib/productsPage';

export const manifest: FeatureManifest = {
  id: 'services',
  page: {
    name: 'products',
    heading: PRODUCTS_HEADING,
    list: () => import('./pages').then((pages) => pages.ProductsPage),
    // Any view's read permission opens the page; each view then shows only what the role may read (the access page works the same way).
    permission: PRODUCTS_PAGE_PERMISSIONS,
  },
  registry: servicesResources,
  palette: [servicesPaletteSource],
};
