// The mock server's stores for the storefront feature, built once from the demo seed on first use. `resetStorefrontStore` puts
// everything back (tests call it after each test through the feature's `reset`).
import { loadDemoState } from '@/mocks/seed';
import { buildStores } from './seed';
import type { Stores } from './types';

let stores: Promise<Stores> | undefined;

/** The stores, seeded from the demo on first use. Handlers change them in place. */
export function storefrontStore(): Promise<Stores> {
  stores ??= loadDemoState().then(buildStores);
  return stores;
}

/** Forgets the stores, so the next request seeds them again from the demo. */
export function resetStorefrontStore(): void {
  stores = undefined;
}
