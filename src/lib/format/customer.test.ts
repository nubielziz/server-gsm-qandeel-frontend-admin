// customerLabel and accountLabel / hasAccountName / maskedAccountLabel: the fallback order name, email, id, "Unknown customer" or "Unknown account".
import { describe, expect, it } from 'vitest';
import { accountLabel, customerLabel, hasAccountName, maskedAccountLabel } from '.';

describe('customerLabel', () => {
  it('prints the trimmed name when there is one', () => {
    expect(customerLabel({ name: '  Maya Haddad ', email: 'maya@example.com', id: 7 })).toBe('Maya Haddad');
  });

  it('falls back to the email when the name is empty', () => {
    expect(customerLabel({ name: '', email: 'maya@example.com', id: 7 })).toBe('maya@example.com');
  });

  it('treats a name with only spaces as empty', () => {
    expect(customerLabel({ name: '   ', email: ' maya@example.com ', id: 7 })).toBe('maya@example.com');
  });

  it('falls back to the id when name and email are empty or missing', () => {
    expect(customerLabel({ name: '', email: '', id: 7 })).toBe('Customer #7');
    expect(customerLabel({ name: null, email: null, id: 12 })).toBe('Customer #12');
    expect(customerLabel({ id: 0 })).toBe('Customer #0');
  });

  it('says Unknown customer when there is nothing at all', () => {
    expect(customerLabel({})).toBe('Unknown customer');
    expect(customerLabel({ name: ' ', email: ' ', id: null })).toBe('Unknown customer');
    expect(customerLabel(null)).toBe('Unknown customer');
    expect(customerLabel(undefined)).toBe('Unknown customer');
  });
});

describe('accountLabel', () => {
  it('prints the trimmed name, then the email, then the number', () => {
    expect(accountLabel({ name: '  Zain Mobile Hub ', email: 'ops@zain.example', id: 1 })).toBe(
      'Zain Mobile Hub',
    );
    expect(accountLabel({ name: '  ', email: ' ops@zain.example ', id: 1 })).toBe('ops@zain.example');
    expect(accountLabel({ name: '', email: '', id: 7 })).toBe('Account #7');
    expect(accountLabel({ id: 0 })).toBe('Account #0');
  });

  it('says Unknown account when there is nothing at all', () => {
    expect(accountLabel({})).toBe('Unknown account');
    expect(accountLabel({ name: ' ', email: ' ', id: null })).toBe('Unknown account');
    expect(accountLabel(null)).toBe('Unknown account');
    expect(accountLabel(undefined)).toBe('Unknown account');
  });

  it('names an anonymized account "Deleted account" whatever its row still says', () => {
    expect(
      accountLabel({ name: 'Deleted account', email: 'x@redacted.invalid', id: 3, status: 'anonymized' }),
    ).toBe('Deleted account');
    expect(accountLabel({ name: 'Maya', id: 3, status: 'active' })).toBe('Maya');
  });
});

describe('hasAccountName and maskedAccountLabel', () => {
  it('is true only for a name with visible text', () => {
    expect(hasAccountName({ name: 'Maya' })).toBe(true);
    expect(hasAccountName({ name: '  ' })).toBe(false);
    expect(hasAccountName(undefined)).toBe(false);
  });

  it('masks only the email fallback', () => {
    expect(maskedAccountLabel({ name: 'Maya Haddad', email: 'maya@example.com', id: 7 })).toBe('Maya Haddad');
    expect(maskedAccountLabel({ name: '', email: 'maya@example.com', id: 7 })).toBe('ma•••@example.com');
    expect(maskedAccountLabel({ id: 9 })).toBe('Account #9');
  });
});
