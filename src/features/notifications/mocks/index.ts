// The notifications feature's dev mocks (`mocks: FeatureMocks`, found by src/mocks/handlers/index.ts): the 12 campaign routes and the 4 staff inbox routes over
// a small made-up audience, seeded with the plan's three campaigns and five inbox items. Deletable with the rest of the mock layer; never in production.
import type { FeatureMocks } from '@/mocks/featureMocks';
import { resetMockStreams } from '@/mocks/stream';
import { campaignRoutes } from './campaignRoutes';
import { inboxRoutes } from './inboxRoutes';
import { resetNotificationsState } from './store';

export { notificationsState } from './store';

/** The feature's mock routes and the reset that puts its store back to the seed. */
export const mocks: FeatureMocks = {
  handlers: [...campaignRoutes, ...inboxRoutes],
  reset: () => {
    resetNotificationsState();
    resetMockStreams();
  },
};
