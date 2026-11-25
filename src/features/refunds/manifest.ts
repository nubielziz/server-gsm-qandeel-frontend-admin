// How the refunds feature plugs into the app (src/app/features.ts finds this file): its Refine resources (refunds, disputes, payments).
// It has no page of its own: the Money page (`/money`, the money feature) shows its views.
import type { FeatureManifest } from '@/app/featureManifest';
import { refundsResources } from './api/resources';

export const manifest: FeatureManifest = {
  id: 'refunds',
  registry: refundsResources,
};
