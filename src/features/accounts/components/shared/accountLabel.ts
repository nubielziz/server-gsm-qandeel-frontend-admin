// How an account is named on screen: the one display name for headings, the breadcrumb, the document title, dialogs and links, and the
// small second line of a list row. The name rule itself is the console's (`accountLabel` of @/lib/format): the trimmed name; else the
// email; else "Account #<id>"; an anonymized account is "Deleted account".
import { accountLabel, hasAccountName } from '@/lib/format';
import type { AccountRow } from '../../types';

export { accountLabel, hasAccountName };

/** The parts of an account the second line needs. */
export type SubLineSource = Pick<AccountRow, 'id' | 'name' | 'email' | 'country' | 'status' | 'hasAccount'>;

/**
 * The second line under an account's name in the list: "#12 · ahmad@example.com · JO". An account with no name is shown by its email,
 * so the email is not printed twice: the line says "Guest" (no login) or "No name" instead; an anonymized one says "Removed".
 */
export function accountSubLine(account: SubLineSource): string {
  if (account.status === 'anonymized') return `#${account.id} · Removed`;
  const middle = hasAccountName(account) ? account.email : account.hasAccount ? 'No name' : 'Guest';
  return [`#${account.id}`, middle, account.country].filter((part) => part.trim() !== '').join(' · ');
}
