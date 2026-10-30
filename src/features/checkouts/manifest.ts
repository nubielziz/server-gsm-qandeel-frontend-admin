// How the checkouts feature plugs into the app (src/app/features.ts finds this file): the Abandoned checkouts page. It has no Refine
// resource of its own: the list and the funnel are action endpoints, read through `useApiQuery`.
import type { FeatureManifest } from '@/app/featureManifest';

/** What the app needs to show the Abandoned checkouts page: its loader. */
export const manifest: FeatureManifest = {
  id: 'checkouts',
  page: {
    name: 'checkouts',
    heading: 'Abandoned checkouts',
    list: () => import('./pages').then((pages) => pages.CheckoutsPage),
  },
};
