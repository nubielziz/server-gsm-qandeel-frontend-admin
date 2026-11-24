// The accounts feature's mock data (decision 014): the stores the mock routes read and change, and the accessor that builds them from the
// demo seed on first use. Rows are kept in a shape close to the API's, plus the few numbers the mock needs to play the server. `dto.ts`
// turns them into what the API sends. Mock data only: the real rules are the server's.
import { buildAccountState } from './seed';
import type { AccountState } from './types';

let state: Promise<AccountState> | undefined;

/** The mock data, seeded from the demo on first use. Handlers change it in place. */
export function accountState(): Promise<AccountState> {
  state ??= buildAccountState();
  return state;
}

/** Drops the data so the next use re-seeds it (tests). */
export function resetAccountStore(): void {
  state = undefined;
}
