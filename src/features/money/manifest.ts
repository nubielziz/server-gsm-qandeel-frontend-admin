// How the money feature plugs into the app (src/app/features.ts finds this file): the Money page (`/money`), the one page of the old Finance
// and "Refunds & disputes" pages (decision 026), with its any-of permission gate. The finance and refunds features keep their data
// registries and their palette search; this feature has none of its own.
import type { FeatureManifest } from '@/app/featureManifest';
import { MONEY_HEADING, MONEY_PAGE_PERMISSIONS } from './lib/moneyViews';

export const manifest: FeatureManifest = {
  id: 'money',
  page: {
    name: 'money',
    // The same h1 on every view (the sidebar label is the same word).
    heading: MONEY_HEADING,
    list: () => import('./pages').then((pages) => pages.MoneyPage),
    // Any one of the read permissions of the views opens the page; each view then checks its own.
    permission: MONEY_PAGE_PERMISSIONS,
  },
};
