// How the risk feature plugs into the app (src/app/features.ts finds this file): the Risk & checks page and the Refine
// resources of the IMEI check log and the blocklist.
import type { FeatureManifest } from '@/app/featureManifest';
import { riskResources } from './api/resources';

export const manifest: FeatureManifest = {
  id: 'risk',
  page: {
    name: 'risk',
    heading: 'Risk & checks',
    list: () => import('./pages').then((pages) => pages.RiskPage),
  },
  registry: riskResources,
};
