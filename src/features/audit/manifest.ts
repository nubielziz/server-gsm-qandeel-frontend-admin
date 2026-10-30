// How the audit feature plugs into the app (src/app/features.ts finds this file): the Audit log page and its Refine resource.
import type { FeatureManifest } from '@/app/featureManifest';
import { auditResources } from './api/resources';

export const manifest: FeatureManifest = {
  id: 'audit',
  page: {
    name: 'audit',
    heading: 'Audit log',
    list: () => import('./pages').then((pages) => pages.AuditPage),
  },
  registry: auditResources,
};
