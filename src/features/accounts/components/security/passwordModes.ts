// The two ways an account gets a password, as the words of the "How" switch of the Password dialog, the Make an account dialog and
// +Add Account. The server makes a temporary password and shows it once (MISMATCHES M12), so there is no box to type one in.
import type { PasswordMode } from '../../types';

/** The two parts of the switch: the left one sends a link, the right one has the server make a temporary password. */
export type HowWords = { link: string; temporary: string };

/**
 * The words of the switch. An account with no password yet gets its invitation again instead of "a link": the newest link replaces the
 * older one either way.
 *
 * @param hasPassword false for an account that never chose a password (an invitation is open or was never used).
 */
export function howWords(hasPassword = true): HowWords {
  return { link: hasPassword ? 'Send a link' : 'Send the invitation again', temporary: 'Temporary password' };
}

/** What the chosen mode means, for the line under the switch. */
export function passwordHint(mode: PasswordMode, hasPassword = true): string {
  if (mode === 'temporary_password') {
    return 'We make one up and show it to you once. They must change it at the next sign-in. Send it to them over a private channel.';
  }
  return hasPassword
    ? 'They pick the password and you never see it. The link works for 1 hour. This is the safer choice.'
    : 'The new invitation replaces the old one. They pick the password and you never see it. The link works for 1 hour.';
}

/** The mode the switch stands for: on (the left part) is a link. */
export function passwordModeOf(link: boolean): PasswordMode {
  return link ? 'reset_link' : 'temporary_password';
}

/** Whether the mode is the link (the switch's value). */
export function isLinkMode(mode: PasswordMode): boolean {
  return mode === 'reset_link';
}
