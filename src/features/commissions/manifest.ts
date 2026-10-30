// How the commissions feature plugs into the app (src/app/features.ts finds this file): the Commissions page and its Refine
// resources (plans, assignments, accruals). The page permission `commissions:read` is already set in src/app/resources.ts.
import type { FeatureManifest } from '@/app/featureManifest';
import { commissionsResources } from './api/resources';

export const manifest: FeatureManifest = {
  id: 'commissions',
  page: {
    name: 'commissions',
    heading: 'Commissions',
    list: () => import('./pages').then((pages) => pages.CommissionsPage),
  },
  registry: commissionsResources,
};
