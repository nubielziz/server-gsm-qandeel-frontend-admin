// A small random delay so loading states are visible in the dev mock layer. No delay under Vitest.
import { delay } from 'msw';

/** Waits 120-400 ms (nothing in tests). Await it at the top of a handler. */
export async function latency(): Promise<void> {
  if (import.meta.env.MODE === 'test') return;
  await delay(120 + Math.floor(Math.random() * 280));
}
