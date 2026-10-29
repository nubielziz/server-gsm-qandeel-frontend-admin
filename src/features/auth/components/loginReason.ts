// Reads `?reason=` of the sign-in URL.
import type { LoginReason } from '../paths';

const REASONS: readonly LoginReason[] = ['suspended', 'ip', 'password-set'];

/** The reason in a URL, or undefined when it is missing or unknown (so a made-up value shows nothing). */
export function parseLoginReason(value: string | null): LoginReason | undefined {
  return REASONS.find((reason) => reason === value);
}
