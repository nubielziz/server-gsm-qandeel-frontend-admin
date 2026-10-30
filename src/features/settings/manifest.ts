// How the settings feature plugs into the app (src/app/features.ts finds this file): the Settings page with its any-tab permission and
// the Refine resources of the gateways, tax rates, currencies, templates and the two logs.
import type { FeatureManifest } from '@/app/featureManifest';
import { settingsResources } from './api/resources';
import { PAGE_PERMISSIONS } from './lib/tabs';

export const manifest: FeatureManifest = {
  id: 'settings',
  page: {
    name: 'settings',
    heading: 'Settings',
    list: () => import('./pages').then((pages) => pages.SettingsPage),
    // Any tab's read permission opens the page; each tab then shows only what the role may read (the access page works the same way).
    permission: PAGE_PERMISSIONS,
  },
  registry: settingsResources,
};
