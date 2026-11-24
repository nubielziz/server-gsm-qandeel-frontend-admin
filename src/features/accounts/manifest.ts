// How the accounts feature plugs into the app (src/app/features.ts finds this file): the Accounts page (`/accounts` and `/accounts/:id`) with its
// any-of permission gate, the Refine resources of the accounts, the ranks, the fixed prices and the data requests, and the palette's account search.
// The feature's folder and names stay `accounts`.
import type { FeatureManifest } from '@/app/featureManifest';
import { accountsResources } from './api/resources';
import { ACCOUNTS_HEADING, ACCOUNTS_PAGE_PERMISSIONS } from './components/frame/accountsPage';
import { accountsPaletteSource } from './lib/paletteSource';

export const manifest: FeatureManifest = {
  id: 'accounts',
  page: {
    name: 'accounts',
    // The list page's h1 and the record's: both say "Accounts" (the account's name is the left menu's title and the breadcrumb).
    heading: ACCOUNTS_HEADING,
    list: () => import('./pages').then((pages) => pages.AccountsPage),
    detail: () => import('./pages').then((pages) => pages.AccountPage),
    // Any one of the two read permissions opens the page; a role with only `groups:read` lands on its Ranks view.
    permission: ACCOUNTS_PAGE_PERMISSIONS,
  },
  registry: accountsResources,
  palette: [accountsPaletteSource],
};
