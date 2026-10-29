// lazyPage: loads a feature's page component only when its route is opened, so each feature ships in its own chunk.
import { lazy, type ComponentType } from 'react';

/**
 * Wraps a named export of a feature's pages entry in `React.lazy`. Features keep their pages out of their main
 * `index.ts` (which `dataRegistry` and `paletteSources` import eagerly) and export them from `features/<name>/pages`:
 *   `orders: lazyPage(() => import('@/features/orders/pages'), 'OrdersPage')`
 */
export function lazyPage<M extends Record<string, unknown>>(load: () => Promise<M>, name: keyof M & string) {
  return lazy(async () => {
    const module = await load();
    const Page = module[name];
    if (typeof Page !== 'function' && typeof Page !== 'object') {
      throw new Error(`lazyPage: "${name}" is not exported by the feature's pages entry`);
    }
    return { default: Page as ComponentType };
  });
}
