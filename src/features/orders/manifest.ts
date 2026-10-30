// How the orders feature plugs into the app (src/app/features.ts finds this file): the Orders page, its Refine
// resources and the palette's order search.
import type { FeatureManifest } from '@/app/featureManifest';
import { ordersResources } from './api/resources';
import { ordersPaletteSource } from './lib/paletteSource';

export const manifest: FeatureManifest = {
  id: 'orders',
  page: {
    name: 'orders',
    heading: 'Orders',
    list: () => import('./pages').then((pages) => pages.OrdersPage),
  },
  registry: ordersResources,
  palette: [ordersPaletteSource],
};
