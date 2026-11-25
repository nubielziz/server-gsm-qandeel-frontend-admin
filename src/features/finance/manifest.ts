// How the finance feature plugs into the app (src/app/features.ts finds this file): its Refine resources (ledger entries, payments,
// invoices) and the palette's journal search. It has no page of its own: the Money page (`/money`, the money feature) shows its views.
import type { FeatureManifest } from '@/app/featureManifest';
import { financeResources } from './api/resources';
import { ledgerPaletteSource } from './lib/paletteSource';

export const manifest: FeatureManifest = {
  id: 'finance',
  registry: financeResources,
  palette: [ledgerPaletteSource],
};
