// The support feature's dev mocks: the routes of `/admin/support-tickets*` and `/admin/reply-templates*`, and the reset that puts the store
// back to its seed. `src/mocks/handlers/index.ts` finds this file on its own (decision 014); feature code never imports it.
import type { FeatureMocks } from '@/mocks/featureMocks';
import { resetSupportStore } from './store';
import { templateHandlers } from './templateHandlers';
import { ticketHandlers } from './ticketHandlers';

export const mocks: FeatureMocks = {
  handlers: [...ticketHandlers, ...templateHandlers],
  reset: resetSupportStore,
};
