// customerLabel / hasCustomerName: the fallback order name, email, id, "Unknown customer".
import { describe, expect, it } from 'vitest';
import { customerLabel, hasCustomerName, maskedCustomerLabel } from '.';

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

describe('hasCustomerName', () => {
  it('is true only for a name with visible text', () => {
    expect(hasCustomerName({ name: 'Maya' })).toBe(true);
    expect(hasCustomerName({ name: '' })).toBe(false);
    expect(hasCustomerName({ name: '  ' })).toBe(false);
    expect(hasCustomerName({ name: null })).toBe(false);
    expect(hasCustomerName(undefined)).toBe(false);
  });
});

describe('maskedCustomerLabel', () => {
  it('prints the name as it is and masks only the email fallback', () => {
    expect(maskedCustomerLabel({ name: 'Maya Haddad', email: 'maya@example.com', id: 7 })).toBe(
      'Maya Haddad',
    );
    expect(maskedCustomerLabel({ name: '', email: 'maya@example.com', id: 7 })).toBe('ma•••@example.com');
  });

  it('falls back to the id and then to Unknown customer when there is no email', () => {
    expect(maskedCustomerLabel({ name: '', email: '', id: 7 })).toBe('Customer #7');
    expect(maskedCustomerLabel({ id: 9 })).toBe('Customer #9');
    expect(maskedCustomerLabel(undefined)).toBe('Unknown customer');
  });
});
