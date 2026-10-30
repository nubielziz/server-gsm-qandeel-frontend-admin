// How the finance feature plugs into the app (src/app/features.ts finds this file). For now only the ledger
// resources the order drawer reads; the Finance page itself is added when the feature is built.
import type { FeatureManifest } from '@/app/featureManifest';
import { financeResources } from './api/resources';

export const manifest: FeatureManifest = {
  id: 'finance',
  registry: financeResources,
};
