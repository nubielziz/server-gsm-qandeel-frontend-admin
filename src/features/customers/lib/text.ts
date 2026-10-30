// Words and small figures for the customer screens. Ports the `created`, `pw` and "Last seen from" lines of accountTab, the
// header sub-line of pageCustomer (48-p-customers.js) and consentsFor of 12-state-b2c.js.
import { ago, fmtDate } from '@/lib/format';
import type { Money } from '@/lib/api';
import type { Customer, CustomerAccount, CustomerDetail, ConsentRecord } from '../types';

/** How the customer came to us: a staff id in `createdBy` means the team added them, else they came on their own. */
export function createdByText(customer: Pick<Customer, 'createdBy' | 'hasAccount'>): string {
  if (customer.createdBy !== null) return 'Added by your team';
  return customer.hasAccount ? 'Signed up on the storefront' : 'Bought as a guest';
}

/** "1 device" / "3 devices": how many open sessions, in words. */
export function devicesText(count: number): string {
  return `${count} ${count === 1 ? 'device' : 'devices'}`;
}

/**
 * The "Password" line of an account. `note` is a second line and `warn` marks a temporary password that is still waiting to
 * be replaced. A link sent after the last change is still open, so it is what the line reports.
 */
export function passwordText(
  account: CustomerAccount,
  now: number = Date.now(),
): { text: string; note?: string; warn: boolean } {
  const sent = account.resetSentAt ? Date.parse(account.resetSentAt) : undefined;
  const changed = account.passwordChangedAt ? Date.parse(account.passwordChangedAt) : 0;
  if (sent !== undefined && sent > changed) {
    return {
      text: `${account.passwordChangedAt ? 'Reset' : 'Invite'} link sent ${ago(sent, now)}`,
      note: account.mustChangePassword
        ? 'Their temporary password still works until they use the link'
        : undefined,
      warn: false,
    };
  }
  if (account.mustChangePassword) {
    return { text: 'Temporary, they must change it at next sign-in', warn: true };
  }
  return {
    text: account.passwordChangedAt ? `Changed ${ago(account.passwordChangedAt, now)}` : 'Not chosen yet',
    warn: false,
  };
}

/**
 * The address "Last seen from" shows. An account has its last session address; a guest has no account, so the address
 * of the latest consent record (the checkout) stands in (MISMATCHES M76).
 */
export function lastSeenIp(detail: Pick<CustomerDetail, 'account' | 'latestConsents'>): string | null {
  return detail.account?.lastIp ?? detail.latestConsents?.records[0]?.ip ?? null;
}

/** "05 Mar": the day a customer joined, without the time (the demo cut `fmtDate` at the comma). */
export function customerSince(createdAt: string): string {
  return fmtDate(createdAt).split(',')[0];
}

// What each purpose means in words, for a record that carries no document name of its own (the demo's `what` texts).
const PURPOSE_LABEL: Readonly<Record<string, string>> = {
  terms: 'Terms of service',
  privacy: 'Privacy policy',
  refund_policy: 'Refund policy',
  withdrawal_waiver: 'Digital service starts now, right of withdrawal is waived',
  marketing: 'Marketing emails (opt-in)',
};

/** What a consent record says: its document with the version when it has one, else the purpose in words. */
export function consentLabel(record: Pick<ConsentRecord, 'purpose' | 'document'>): string {
  if (record.document) return record.document;
  const known = PURPOSE_LABEL[record.purpose];
  if (known) return known;
  const spaced = record.purpose.replace(/_/g, ' ');
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

/** True for an amount of exactly zero ("0.0000"), so the list can show a dash instead of "$0.00". Display only. */
export function isZeroMoney(value: Money): boolean {
  return Number(value) === 0;
}
