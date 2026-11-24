// The support feature's dev mocks: the routes of `/admin/support-tickets*` (the thread's live routes too) and `/admin/reply-templates*`, and the
// reset that puts the store back to its seed and stops the dev stand-in for the customer. `src/mocks/handlers/index.ts` finds this file on its own (decision 014); feature code never imports it.
import type { FeatureMocks } from '@/mocks/featureMocks';
import { stopEchoes } from './echo';
import { liveHandlers } from './liveHandlers';
import { resetSupportStore } from './store';
import { templateHandlers } from './templateHandlers';
import { ticketHandlers } from './ticketHandlers';

export const mocks: FeatureMocks = {
  // The live routes end in `/read` or `/files…`, so the plain `/:id` routes never answer them (and the reverse).
  handlers: [...liveHandlers, ...ticketHandlers, ...templateHandlers],
  reset: () => {
    stopEchoes();
    resetSupportStore();
  },
};
