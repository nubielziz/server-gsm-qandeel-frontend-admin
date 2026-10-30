// How the customers feature plugs into the app (src/app/features.ts finds this file): the Customers page and its detail view, the
// Refine resources `customers` and `data-requests`, and the palette's customer search.
import type { FeatureManifest } from '@/app/featureManifest';
import { customersResources } from './api/resources';
import { customersPaletteSource } from './lib/paletteSource';

export const manifest: FeatureManifest = {
  id: 'customers',
  page: {
    name: 'customers',
    // The list page's h1; the detail page's h1 is the customer's name.
    heading: 'Customers',
    list: () => import('./pages').then((pages) => pages.CustomersPage),
    detail: () => import('./pages').then((pages) => pages.CustomerPage),
  },
  registry: customersResources,
  palette: [customersPaletteSource],
};
