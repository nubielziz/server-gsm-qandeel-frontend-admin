// How System health plugs into the app (src/app/features.ts finds this file). No demo page: the design is
// docs/system-health-design.md. Any one of the three read permissions of its tabs opens the page, and the maintenance
// banner joins the app shell on every page while maintenance is on.
import type { FeatureManifest } from '@/app/featureManifest';
import { systemHealthResources } from './api/resources';
import { MaintenanceBanner } from './header/MaintenanceBanner';

export const manifest: FeatureManifest = {
  id: 'system-health',
  page: {
    name: 'system-health',
    heading: 'System health',
    list: () => import('./pages').then((pages) => pages.SystemHealthPage),
    permission: ['system:read', 'alerts:read', 'incidents:read'],
  },
  registry: systemHealthResources,
  banner: MaintenanceBanner,
};
