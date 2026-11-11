// The Idempotency-Key a wallet dialog makes when it opens (feature 21, D5): a UUID, which fits the server's rule (1 to 100 printable
// characters, no spaces). One key per dialog opening, sent with every retry of that opening.

/** A fresh key. */
export function newIdempotencyKey(): string {
  if (typeof globalThis.crypto?.randomUUID === 'function') return globalThis.crypto.randomUUID();
  // Old browsers: a time-and-random key of the same shape of characters.
  return `k-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}
