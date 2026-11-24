// Tests for the log helpers: the status looks and the JSON text.
import { describe, expect, it } from 'vitest';
import { jsonText, NOTIFICATION_STATUS } from './logs';

describe('statuses', () => {
  it('give every status a word, an icon and a tone', () => {
    for (const look of Object.values(NOTIFICATION_STATUS)) {
      expect(look.label).not.toBe('');
      expect(look.icon).not.toBe('');
    }
    expect(NOTIFICATION_STATUS.failed.tone).toBe('crit');
  });
});

describe('jsonText', () => {
  it('indents JSON and handles nothing', () => {
    expect(jsonText({ a: 1 })).toBe('{\n  "a": 1\n}');
    expect(jsonText(undefined)).toBe('');
  });
});
