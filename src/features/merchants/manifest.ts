// How the merchants feature plugs into the app (src/app/features.ts finds this file): the Merchants page with its list and
// detail views, its Refine resources, the any-tab permission that opens the page, and the palette's merchant search.
import type { FeatureManifest } from '@/app/featureManifest';
import { merchantsResources } from './api/resources';
import { merchantsPaletteSource } from './lib/paletteSource';

export const manifest: FeatureManifest = {
  id: 'merchants',
  page: {
    name: 'merchants',
    heading: 'Merchants',
    list: () => import('./pages').then((pages) => pages.MerchantsPage),
    detail: () => import('./pages').then((pages) => pages.MerchantPage),
    // Any tab's read permission opens the page; each tab then shows only what the role may read (MISMATCHES M52).
    permission: ['clients:read', 'groups:read', 'kyc:read'],
  },
  registry: merchantsResources,
  palette: [merchantsPaletteSource],
};
