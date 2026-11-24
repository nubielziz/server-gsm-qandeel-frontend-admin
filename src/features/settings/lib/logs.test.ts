// Tests for the log helpers: the status looks, the recipient type in words and the JSON text.
import { describe, expect, it } from 'vitest';
import { jsonText, NOTIFICATION_STATUS, recipientTypeText } from './logs';

describe('statuses', () => {
  it('give every status a word, an icon and a tone', () => {
    for (const look of Object.values(NOTIFICATION_STATUS)) {
      expect(look.label).not.toBe('');
      expect(look.icon).not.toBe('');
    }
    expect(NOTIFICATION_STATUS.failed.tone).toBe('crit');
  });
});

describe('recipientTypeText', () => {
  it('reads a new line as Account and keeps the meaning of the old words', () => {
    expect(recipientTypeText('account')).toBe('Account');
    expect(recipientTypeText('client')).toBe('Merchant');
    expect(recipientTypeText('customer')).toBe('Customer');
    expect(recipientTypeText('staff')).toBe('Staff');
  });

  it('shows a word it does not know as it came', () => {
    expect(recipientTypeText('webhook')).toBe('webhook');
  });
});

describe('jsonText', () => {
  it('indents JSON and handles nothing', () => {
    expect(jsonText({ a: 1 })).toBe('{\n  "a": 1\n}');
    expect(jsonText(undefined)).toBe('');
  });
});
