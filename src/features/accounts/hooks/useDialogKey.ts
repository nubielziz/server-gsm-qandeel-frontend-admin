// One Idempotency-Key per dialog opening: a dialog is mounted only while it is open, so the key made when it mounts lives exactly
// as long as that opening and is sent with every retry of it; the next opening makes a new one.
import { useState } from 'react';
import { newIdempotencyKey } from '../lib/idempotency';

/** A key made once when the component mounts and kept until it unmounts. */
export function useDialogKey(): string {
  const [key] = useState(newIdempotencyKey);
  return key;
}
