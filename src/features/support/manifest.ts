// How the support feature plugs into the app (src/app/features.ts finds this file): the Support page, the Refine resources
// `support-tickets` and `reply-templates`, the palette's ticket search, and the alerts for a new customer message (a top bar slot that draws nothing).
import type { FeatureManifest } from '@/app/featureManifest';
import { supportResources } from './api/resources';
import { SupportAlerts } from './components/SupportAlerts';
import { supportPaletteSource } from './lib/paletteSource';

export const manifest: FeatureManifest = {
  id: 'support',
  page: {
    name: 'support',
    heading: 'Support',
    list: () => import('./pages').then((pages) => pages.SupportPage),
  },
  registry: supportResources,
  palette: [supportPaletteSource],
  topbar: SupportAlerts,
};
