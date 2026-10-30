// How the suppliers feature plugs into the app (src/app/features.ts finds this file): the Suppliers page, its Refine resources
// (suppliers and the API log) and the palette's supplier search.
import type { FeatureManifest } from '@/app/featureManifest';
import { suppliersResources } from './api/resources';
import { suppliersPaletteSource } from './lib/paletteSource';

/** What the app needs to show the Suppliers page: its loader, the data registry and the palette search. */
export const manifest: FeatureManifest = {
  id: 'suppliers',
  page: {
    name: 'suppliers',
    heading: 'Suppliers',
    list: () => import('./pages').then((pages) => pages.SuppliersPage),
  },
  registry: suppliersResources,
  palette: [suppliersPaletteSource],
};
