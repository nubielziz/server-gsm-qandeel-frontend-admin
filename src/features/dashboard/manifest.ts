// How the dashboard feature plugs into the app (src/app/features.ts finds this file): the Dashboard page, and the sidebar
// counts, which every page's shell reads from the dashboard payload. The dashboard has no CRUD resource, so no registry.
import type { FeatureManifest } from '@/app/featureManifest';
import { useDashboardNavCounts } from './hooks/useDashboardNavCounts';

export const manifest: FeatureManifest = {
  id: 'dashboard',
  page: {
    name: 'dashboard',
    heading: 'Dashboard',
    list: () => import('./pages').then((pages) => pages.DashboardPage),
  },
  useNavCounts: useDashboardNavCounts,
};
