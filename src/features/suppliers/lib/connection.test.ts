// Tests for the words of the Connection panel and of the connection test.
import { describe, expect, it } from 'vitest';
import { driverLabel, DRIVERS, hostOf, limitsText, maskedKey, testSummary } from './connection';

describe('driverLabel', () => {
  it('uses the demo’s names and shows an unknown driver as it is', () => {
    expect(driverLabel('dhru')).toBe('Dhru Fusion 6.1');
    expect(driverLabel('rest')).toBe('REST v2');
    expect(driverLabel('soap')).toBe('soap');
    expect(DRIVERS.map((driver) => driver.value)).toEqual(['dhru', 'rest']);
  });
});

describe('hostOf', () => {
  it('keeps the host and the port, and survives text that is not a URL', () => {
    expect(hostOf('https://api.nordicgsm.example/api/index.php')).toBe('api.nordicgsm.example');
    expect(hostOf('http://localhost:8080/x')).toBe('localhost:8080');
    expect(hostOf('api.example.com/v2')).toBe('api.example.com');
  });
});

describe('limitsText and maskedKey', () => {
  it('writes the limits in one sentence', () => {
    expect(limitsText({ maxConcurrency: 5, rateLimitPerMin: 60, timeoutMs: 15000 })).toBe(
      '5 at a time, 60 per minute, 15\u00a0s timeout',
    );
  });

  it('shows the hint of the key and dots, or only dots', () => {
    expect(maskedKey('sk_57')).toBe('sk_57••••••••');
    expect(maskedKey(null)).toBe('••••••••••••');
  });
});

describe('testSummary', () => {
  it('says who was authenticated, the balance and the time', () => {
    expect(
      testSummary({
        message: 'Authenticated.',
        durationMs: 310,
        accountName: 'GSM Supply',
        balance: '1850.0000',
      }),
    ).toBe('Authenticated as GSM Supply. Balance $1,850.00. Answered in 310\u00a0ms.');
  });

  it('falls back to the server’s message when it names no account', () => {
    expect(testSummary({ message: 'Key accepted.', durationMs: null })).toBe('Key accepted.');
  });
});
