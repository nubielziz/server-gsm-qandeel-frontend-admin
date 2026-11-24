// What a feature's dev mocks export from `src/features/<name>/mocks/index.ts`. The mock layer finds those files on its
// own (handlers/index.ts), so a feature adds its mock routes without editing shared files.
import type { RequestHandler } from 'msw';

export type FeatureMocks = {
  /** The feature's mock routes, most specific first (a generic `/:id` would otherwise answer `/export`). */
  handlers: RequestHandler[];
  /** Puts the feature's mock stores back to their seed; tests call it after each test. */
  reset?: () => void;
};

/**
 * The feature folders whose mocks are no longer registered: merchants and customers are one accounts table now, and the accounts
 * feature's mocks serve every route they served. The folders stay until the Accounts page replaces them; their tests that need
 * their own handlers install them by hand.
 */
export const RETIRED_FEATURE_MOCKS: readonly string[] = ['merchants', 'customers'];

/** True for the path of a mocks file that belongs to a retired feature (`../../features/customers/mocks/index.ts`). */
export function isRetiredFeatureMock(file: string): boolean {
  return RETIRED_FEATURE_MOCKS.some((name) => file.includes(`/features/${name}/mocks/`));
}
