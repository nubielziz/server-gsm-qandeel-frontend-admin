// How the refunds feature plugs into the app (src/app/features.ts finds this file): the "Refunds & disputes" page, its Refine
// resources, and the any-tab permission that opens the page.
import type { FeatureManifest } from '@/app/featureManifest';
import { refundsResources } from './api/resources';

export const manifest: FeatureManifest = {
  id: 'refunds',
  page: {
    name: 'refunds',
    heading: 'Refunds & disputes',
    list: () => import('./pages').then((pages) => pages.RefundsPage),
    // Any tab's read permission opens the page; each tab then shows only what the role may read.
    permission: ['refunds:read', 'disputes:read', 'reports:finance'],
  },
  registry: refundsResources,
};
