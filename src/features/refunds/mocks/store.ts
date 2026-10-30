// The refunds mock state, built from the demo seed on first use and kept for the life of the page (or the test).
import { buildState, type RefundsMockState } from './seed';

let state: Promise<RefundsMockState> | undefined;

/** The refunds, disputes and payments the mock routes read and change. */
export function refundsState(): Promise<RefundsMockState> {
  state ??= buildState();
  return state;
}

/** Drops the state so the next use re-seeds it (tests call this after each test). */
export function resetRefundsState(): void {
  state = undefined;
}
