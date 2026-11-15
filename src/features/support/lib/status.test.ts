// requesterLabel and firstName: who wrote a ticket, even when a customer has no name.
import { describe, expect, it } from 'vitest';
import { firstName, requesterLabel } from './status';

describe('requesterLabel', () => {
  it('names a merchant by the name on the ticket and a customer by theirs', () => {
    expect(
      requesterLabel({
        requesterType: 'client',
        requesterId: 3,
        requester: { name: 'Phone Doctor', email: null },
      }),
    ).toBe('Phone Doctor');
    expect(
      requesterLabel({
        requesterType: 'customer',
        requesterId: 9,
        requester: { name: 'Maya Haddad', email: 'maya@example.com' },
      }),
    ).toBe('Maya Haddad');
  });

  it('names a customer with no name by the masked email, else by the customer number', () => {
    expect(
      requesterLabel({
        requesterType: 'customer',
        requesterId: 9,
        requester: { name: '', email: 'maya@example.com' },
      }),
    ).toBe('ma•••@example.com');
    expect(
      requesterLabel({ requesterType: 'customer', requesterId: 9, requester: { name: ' ', email: null } }),
    ).toBe('Customer #9');
  });
});

describe('firstName', () => {
  it('is the first word, and empty for an empty name', () => {
    expect(firstName(' Maya  Haddad ')).toBe('Maya');
    expect(firstName('')).toBe('');
  });
});
