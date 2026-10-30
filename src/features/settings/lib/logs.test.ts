// Tests for the log helpers: the answer text, the retry check, JSON text and the address host.
import { describe, expect, it } from 'vitest';
import { answerText, canRetry, DELIVERY_STATUS, hostOf, jsonText, NOTIFICATION_STATUS } from './logs';

describe('answerText and canRetry', () => {
  it('says No answer for code 0', () => {
    expect(answerText(200)).toBe('200');
    expect(answerText(0)).toBe('No answer');
  });

  it('allows a retry unless the delivery worked', () => {
    expect(canRetry({ status: 'failed' })).toBe(true);
    expect(canRetry({ status: 'pending' })).toBe(true);
    expect(canRetry({ status: 'delivered' })).toBe(false);
  });
});

describe('statuses', () => {
  it('give every status a word, an icon and a tone', () => {
    for (const look of [...Object.values(NOTIFICATION_STATUS), ...Object.values(DELIVERY_STATUS)]) {
      expect(look.label).not.toBe('');
      expect(look.icon).not.toBe('');
    }
    expect(DELIVERY_STATUS.failed.tone).toBe('crit');
  });
});

describe('jsonText and hostOf', () => {
  it('indents JSON and handles nothing', () => {
    expect(jsonText({ a: 1 })).toBe('{\n  "a": 1\n}');
    expect(jsonText(undefined)).toBe('');
  });

  it('shows the host of an address, or the text when it is not one', () => {
    expect(hostOf('https://hooks.zain.example/gsm')).toBe('hooks.zain.example');
    expect(hostOf('not a url')).toBe('not a url');
  });
});
