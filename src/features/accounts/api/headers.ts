// The `Idempotency-Key` header every wallet write and the rank change carry: merged with the caller's own headers. A refusal of a reused key
// is worded for staff (lib/keyReuse), so every dialog that sends a key shows the same plain sentence.
import type { ApiInit } from '@/lib/api';
import { isKeyReused, withKeyReusedWords } from '../lib/keyReuse';

/** `init` with the dialog's key added to its headers. */
export function idempotencyHeaders(idempotencyKey: string, init?: ApiInit): ApiInit {
  return { ...init, headers: { ...init?.headers, 'Idempotency-Key': idempotencyKey } };
}

/**
 * Sends a keyed write and words the server's refusal of a reused key (409 `IDEMPOTENCY_KEY_REUSED`) in plain sentences: any other answer
 * or error passes through as it is.
 *
 * @param request the keyed request, already started.
 * @returns the request's answer.
 * @throws the request's error; a reused key's error carries the plain detail.
 */
export async function keyedWrite<T>(request: Promise<T>): Promise<T> {
  try {
    return await request;
  } catch (error) {
    throw isKeyReused(error) ? withKeyReusedWords(error) : error;
  }
}
