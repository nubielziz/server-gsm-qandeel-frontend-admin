// What a feature's dev mocks export from `src/features/<name>/mocks/index.ts`. The mock layer finds those files on its
// own (handlers/index.ts), so a feature adds its mock routes without editing shared files.
import type { RequestHandler } from 'msw';

export type FeatureMocks = {
  /** The feature's mock routes, most specific first (a generic `/:id` would otherwise answer `/export`). */
  handlers: RequestHandler[];
  /** Puts the feature's mock stores back to their seed; tests call it after each test. */
  reset?: () => void;
};
