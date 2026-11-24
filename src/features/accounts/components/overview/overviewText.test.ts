// Tests for the words of the Overview part: dates, who made the account, the suspension line, the sign-in kind and each figure's note.
// Ports the cases of the old customer and merchant text helpers (created by, since, joined days) in this layout's words.
import { describe, expect, it } from 'vitest';
import { account, guest, merchantAccount, VIP_RANK, RETAIL_RANK } from '../../test/fixtures';
import {
  anonymizedLine,
  availableNote,
  createdByText,
  dayText,
  heldText,
  joinedText,
  lastOrderText,
  lastSignInText,
  linkSentText,
  marginText,
  ordersText,
  rankNote,
  signInKind,
  suspensionLine,
  verifiedText,
} from './overviewText';

const NOW = Date.parse('2026-01-10T12:00:00.000Z');

describe('dayText', () => {
  it('writes a day as day, short month and year', () => {
    expect(dayText('2026-03-03T12:00:00.000Z')).toBe('3 Mar 2026');
    expect(dayText('2025-12-01T12:00:00.000Z')).toBe('1 Dec 2025');
  });

  it('is empty for a missing or unreadable time', () => {
    expect(dayText(null)).toBe('');
    expect(dayText(undefined)).toBe('');
    expect(dayText('not a date')).toBe('');
  });
});

describe('createdByText', () => {
  const retail = { kind: 'retail' } as const;
  const merchant = { kind: 'merchant' } as const;

  it('reads a staff creator as "added by your team", whatever the account', () => {
    expect(createdByText({ createdBy: { id: 3, name: 'Rami K.' }, hasAccount: true, rank: retail })).toBe(
      'Added by your team',
    );
    expect(createdByText({ createdBy: { id: 3, name: 'Rami K.' }, hasAccount: false, rank: retail })).toBe(
      'Added by your team',
    );
    expect(createdByText({ createdBy: { id: 3, name: 'Rami K.' }, hasAccount: true, rank: merchant })).toBe(
      'Added by your team',
    );
  });

  it('reads no creator as a sign-up in the shop for a retail login and a purchase for a guest', () => {
    expect(createdByText({ createdBy: null, hasAccount: true, rank: retail })).toBe('Signed up in the shop');
    expect(createdByText({ createdBy: null, hasAccount: false, rank: retail })).toBe('Bought as a guest');
  });

  it('does not say a merchant signed up in the shop: the shop has no merchant sign-up', () => {
    expect(createdByText({ createdBy: null, hasAccount: true, rank: merchant })).toBe(
      'Signed up on their own',
    );
  });
});

describe('joinedText', () => {
  it('says how long ago the account began, in whole days', () => {
    const now = Date.parse('2026-06-01T12:00:00.000Z');
    expect(joinedText('2026-06-01T01:00:00.000Z', now)).toBe('Joined today');
    expect(joinedText('2026-05-31T01:00:00.000Z', now)).toBe('Joined 1 day ago');
    expect(joinedText('2025-04-18T12:00:00.000Z', now)).toBe('Joined 409 days ago');
    expect(joinedText('not a date', now)).toBe('');
  });
});

describe('verifiedText', () => {
  it('says verified with the day, or not verified', () => {
    expect(verifiedText({ emailVerifiedAt: '2026-03-03T12:00:00.000Z' })).toBe('Verified 3 Mar 2026');
    expect(verifiedText({ emailVerifiedAt: null })).toBe('Not verified');
  });
});

describe('rankNote', () => {
  it("says what a rank means: a merchant rank with its discount, or the shop's rank", () => {
    expect(rankNote(VIP_RANK)).toBe('merchant rank · 8% off base prices');
    expect(rankNote({ kind: 'merchant', discountPercent: '0.0000' })).toBe('merchant rank · base prices');
    expect(rankNote({ kind: 'merchant', discountPercent: '2.5000' })).toBe(
      'merchant rank · 2.5% off base prices',
    );
    expect(rankNote(RETAIL_RANK)).toBe("the shop's rank");
  });
});

describe('suspensionLine', () => {
  it('shows the reason, who suspended the account and when, leaving out what the server did not say', () => {
    expect(
      suspensionLine(
        { at: '2026-01-04T12:00:00.000Z', reason: 'Chargeback dispute', by: { id: 1, name: 'Rami K.' } },
        NOW,
      ),
    ).toBe('Reason: Chargeback dispute · by Rami K. · 6d ago');
    expect(suspensionLine({ at: null, reason: 'Fraud review', by: null }, NOW)).toBe('Reason: Fraud review');
    expect(suspensionLine({ at: '2026-01-10T11:59:40.000Z', reason: null, by: null }, NOW)).toBe('just now');
    expect(suspensionLine(null, NOW)).toBe('');
  });
});

describe('anonymizedLine', () => {
  it('says what was removed and what stays for accounting', () => {
    expect(anonymizedLine('2026-03-03T12:00:00.000Z')).toBe(
      'Anonymized on 3 Mar 2026. Name, email and IMEIs are removed; orders and payments stay for accounting.',
    );
    expect(anonymizedLine(null)).toMatch(/^Anonymized\. Name, email and IMEIs/);
  });
});

describe('lastSignInText', () => {
  it('is the age of the last sign-in, or "Never"', () => {
    expect(lastSignInText('2026-01-07T12:00:00.000Z', NOW)).toBe('3d ago');
    expect(lastSignInText(null, NOW)).toBe('Never');
  });
});

describe('signInKind', () => {
  it('tells a guest, an open invitation and a working login apart', () => {
    expect(signInKind(guest())).toBe('guest');
    expect(signInKind(account({ invitationPending: true }))).toBe('invited');
    expect(signInKind(account())).toBe('login');
    expect(signInKind(merchantAccount())).toBe('login');
  });

  it('names the link only when the server says when it was sent', () => {
    expect(linkSentText('2026-01-10T10:00:00.000Z', NOW)).toBe('link sent 2h ago');
    expect(linkSentText(null, NOW)).toBe('');
    expect(linkSentText(undefined, NOW)).toBe('');
  });
});

describe('the figures', () => {
  it('says what is held in open orders, or that nothing is', () => {
    expect(heldText('71.2300')).toBe('$71.23 held in open orders');
    expect(heldText('0.0000')).toBe('No open holds');
  });

  it('says what a merchant can spend beyond the wallet', () => {
    expect(availableNote('2000.0000')).toBe('wallet plus $2,000 credit limit');
  });

  it('counts orders in words', () => {
    expect(ordersText(1)).toBe('1 order');
    expect(ordersText(0)).toBe('0 orders');
    expect(ordersText(1204)).toBe('1,204 orders');
  });

  it('writes the margin, or says nothing sold yet', () => {
    expect(marginText('7.4000')).toBe('7.4% margin');
    expect(marginText('12.0000')).toBe('12% margin');
    expect(marginText(null)).toBe('No sales yet');
  });

  it('says how long ago the last order was, or that there is none', () => {
    expect(lastOrderText(4, '2026-01-10T10:00:00.000Z', NOW)).toBe('last 2h ago');
    expect(lastOrderText(0, null, NOW)).toBe('No orders yet');
    expect(lastOrderText(3, null, NOW)).toBe('');
  });
});
