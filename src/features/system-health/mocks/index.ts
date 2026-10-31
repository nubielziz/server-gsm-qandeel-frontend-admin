// The System health feature's dev mocks (`mocks: FeatureMocks`, found by src/mocks/handlers/index.ts): the 30 routes of
// route group `health`, played per scenario (`?mock=healthy|degraded|outage|monitoring-down|partial-failure|maintenance|readonly`,
// see src/mocks/scenario.ts). Deletable with the rest of the mock layer; the app never loads it in production.
import type { FeatureMocks } from '@/mocks/featureMocks';
import { resetHealthState } from './state';
import { alertRoutes } from './routes/alerts';
import { healthRoutes } from './routes/health';
import { incidentRoutes } from './routes/incidents';
import { integrityRoutes } from './routes/integrity';
import { pipelineRoutes } from './routes/pipeline';
import { queueRoutes } from './routes/queues';
import { ruleRoutes } from './routes/rules';
import { storeRoutes } from './routes/stores';
import { trafficRoutes } from './routes/traffic';

/** The feature's mock routes and the reset that puts its state back to the seed. */
export const mocks: FeatureMocks = {
  handlers: [
    ...healthRoutes,
    ...trafficRoutes,
    ...pipelineRoutes,
    ...queueRoutes,
    ...storeRoutes,
    ...integrityRoutes,
    ...alertRoutes,
    ...ruleRoutes,
    ...incidentRoutes,
  ],
  reset: resetHealthState,
};
