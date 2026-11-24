// requesterLabel, isMerchantRequester and firstName: who wrote a ticket, even when an account has no name.
import { describe, expect, it } from 'vitest';
import { firstName, isMerchantRequester, requesterLabel } from './status';

describe('requesterLabel', () => {
  it('names an account by the name on the ticket, whatever its rank', () => {
    expect(
      requesterLabel({
        requesterId: 3,
        requester: { name: 'Phone Doctor', email: null, rankKind: 'merchant' },
      }),
    ).toBe('Phone Doctor');
    expect(
      requesterLabel({
        requesterId: 109,
        requester: { name: 'Maya Haddad', email: 'maya@example.com', rankKind: 'retail' },
      }),
    ).toBe('Maya Haddad');
  });

  it('names an account with no name by the masked email, else by the account number', () => {
    expect(
      requesterLabel({
        requesterId: 109,
        requester: { name: '', email: 'maya@example.com', rankKind: 'retail' },
      }),
    ).toBe('ma•••@example.com');
    expect(
      requesterLabel({ requesterId: 109, requester: { name: ' ', email: null, rankKind: 'retail' } }),
    ).toBe('Account #109');
  });
});

describe('isMerchantRequester', () => {
  it('is true only for an explicit merchant rank', () => {
    expect(isMerchantRequester({ requester: { name: 'A', email: null, rankKind: 'merchant' } })).toBe(true);
    expect(isMerchantRequester({ requester: { name: 'A', email: null, rankKind: 'retail' } })).toBe(false);
    // A row from an older server has no rank kind: it reads as retail, the side that is masked.
    expect(isMerchantRequester({ requester: { name: 'A', email: null } as never })).toBe(false);
  });
});

describe('firstName', () => {
  it('is the first word, and empty for an empty name', () => {
    expect(firstName(' Maya  Haddad ')).toBe('Maya');
    expect(firstName('')).toBe('');
  });
});
