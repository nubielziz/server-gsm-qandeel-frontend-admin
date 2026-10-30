// How the finance feature plugs into the app (src/app/features.ts finds this file): the Finance page, its Refine resources
// (ledger entries, payments, invoices) and the palette's journal search.
import type { FeatureManifest } from '@/app/featureManifest';
import { financeResources } from './api/resources';
import { ledgerPaletteSource } from './lib/paletteSource';
import { FINANCE_PAGE_PERMISSION } from './lib/tabs';

export const manifest: FeatureManifest = {
  id: 'finance',
  page: {
    name: 'finance',
    heading: 'Finance',
    list: () => import('./pages').then((pages) => pages.FinancePage),
    permission: FINANCE_PAGE_PERMISSION,
  },
  registry: financeResources,
  palette: [ledgerPaletteSource],
};
