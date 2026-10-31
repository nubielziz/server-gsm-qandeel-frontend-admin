// Test helpers for the System health mock: start the mock API, sign the owner in, freeze the clock, and read a failed
// call as an `ApiError`. Import from tests only.
import { afterEach, beforeEach, vi } from 'vitest';
import { isApiError, type ApiError } from '@/lib/api';
import { setupMockApi, signInAs } from '@/test/mockApi';

/** Starts the mock API for a test file (once, at the top) and signs the owner in before each test. */
export function setupHealthMocks(): void {
  setupMockApi();
  beforeEach(async () => {
    await signInAs();
  });
}

/** Freezes `Date` (and nothing else, so the mock server keeps running) at a moment, for tests that compare series. */
export function freezeClock(at: string): void {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(at));
  });
  afterEach(() => vi.useRealTimers());
}

/** Waits for a call that must fail and returns its `ApiError`; fails the test when the call works. */
export async function failure(call: Promise<unknown>): Promise<ApiError> {
  try {
    await call;
  } catch (error) {
    if (isApiError(error)) return error;
    throw error;
  }
  throw new Error('The call was expected to fail, but it worked.');
}

/** A valid body for `POST /admin/alert-rules`. */
export const NEW_RULE = {
  key: 'webhook_backlog',
  name: 'Webhook backlog',
  metric: 'queue.oldest_age',
  comparator: 'gt',
  threshold: 300,
  windowSeconds: 300,
  severity: 'warning',
  channels: ['email'],
};
