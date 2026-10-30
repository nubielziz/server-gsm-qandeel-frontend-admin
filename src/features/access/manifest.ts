// How the access feature plugs into the app (src/app/features.ts finds this file): the "Admins and access" page, its
// Refine resources, and the any-tab permission that opens the page.
import type { FeatureManifest } from '@/app/featureManifest';
import { accessResources } from './api/resources';

export const manifest: FeatureManifest = {
  id: 'access',
  page: {
    name: 'access',
    heading: 'Admins and access',
    list: () => import('./pages').then((pages) => pages.AccessPage),
    // Any tab's read permission opens the page; each tab then shows only what the role may read (MISMATCHES M19).
    permission: ['staff:read', 'access:read', 'roles:read', 'sessions:read'],
  },
  registry: accessResources,
};
