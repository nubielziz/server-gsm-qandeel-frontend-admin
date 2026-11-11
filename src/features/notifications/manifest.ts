// How the notifications feature plugs into the app (src/app/features.ts finds this file): the Notifications page (campaigns list and detail) and the staff
// bell in the top bar. The routes are action endpoints, read through `useApiQuery`, so there is no data registry.
import type { FeatureManifest } from '@/app/featureManifest';
import { NotificationBell } from './components/NotificationBell';

/** What the app needs to show the Notifications page and the bell. */
export const manifest: FeatureManifest = {
  id: 'notifications',
  page: {
    name: 'notifications',
    heading: 'Notifications',
    list: () => import('./pages').then((pages) => pages.NotificationsPage),
    detail: () => import('./pages').then((pages) => pages.CampaignPage),
  },
  topbar: NotificationBell,
};
