// Tests for the API key input helpers: the address lines, the limit, the expiry day, and folding the server's per-entry errors onto the box.
import { describe, expect, it } from 'vitest';
import { ApiError } from '@/lib/api';
import {
  cleanKeyName,
  dayIsPast,
  expiryOf,
  foldKeyErrors,
  ipLines,
  parseIpLines,
  parseRateLimit,
  RATE_LIMIT,
} from './keyInput';

describe('parseIpLines', () => {
  it('splits on lines, commas and spaces and drops the empty ones', () => {
    expect(parseIpLines('203.0.113.55\n\n 198.51.100.0/24 , 2001:db8::1 ')).toEqual([
      '203.0.113.55',
      '198.51.100.0/24',
      '2001:db8::1',
    ]);
    expect(parseIpLines('   ')).toEqual([]);
  });

  it('round-trips through the box', () => {
    expect(parseIpLines(ipLines(['10.0.0.1', '10.0.0.2']))).toEqual(['10.0.0.1', '10.0.0.2']);
  });
});

describe('parseRateLimit', () => {
  it('accepts whole numbers from 1 to 6000 only', () => {
    expect(parseRateLimit('60')).toBe(60);
    expect(parseRateLimit(' 6000 ')).toBe(6000);
    expect(parseRateLimit('0')).toBeNull();
    expect(parseRateLimit('6001')).toBeNull();
    expect(parseRateLimit('1.5')).toBeNull();
    expect(parseRateLimit('lots')).toBeNull();
    expect(parseRateLimit('')).toBeNull();
  });

  it('starts a new key at 60 a minute, inside the range', () => {
    expect(RATE_LIMIT).toEqual({ min: 1, max: 6000, default: 60 });
  });
});

describe('expiry', () => {
  it('ends the chosen day and treats an empty day as no expiry', () => {
    expect(expiryOf('')).toBeUndefined();
    expect(expiryOf('2999-01-31')).toMatch(/^2999-01-3[01]T/);
    expect(expiryOf('not a day')).toBeUndefined();
  });

  it('knows a past day from a future one', () => {
    expect(dayIsPast('2000-01-01')).toBe(true);
    expect(dayIsPast('2999-01-01')).toBe(false);
    expect(dayIsPast('')).toBe(false);
  });
});

describe('cleanKeyName', () => {
  it('trims the name and keeps what is inside it', () => {
    expect(cleanKeyName('  Production  server ')).toBe('Production  server');
  });
});

describe('foldKeyErrors', () => {
  const problem = (fieldErrors: Record<string, string[]>) =>
    new ApiError({ status: 422, code: 'VALIDATION_FAILED', title: 'Check the form', fieldErrors });

  it('puts the entries of the address list under its one box, with the line of each address', () => {
    const folded = foldKeyErrors(
      problem({
        'allowedIps.0': ['Enter an IP address or range.'],
        'allowedIps.2': ['Enter an IP address or range.'],
        name: ['Name the key.'],
      }),
    );
    expect(folded).toMatchObject({
      status: 422,
      fieldErrors: {
        allowedIps: ['Line 1: Enter an IP address or range.', 'Line 3: Enter an IP address or range.'],
        name: ['Name the key.'],
      },
    });
  });

  it('keeps the codes of the fields it carries over', () => {
    const error = new ApiError({
      status: 422,
      code: 'VALIDATION_FAILED',
      fieldErrors: { 'allowedIps.0': ['Enter an IP address or range.'] },
      fieldCodes: { name: ['too_many_keys'] },
    });
    expect(foldKeyErrors(error)).toMatchObject({ fieldCodes: { name: ['too_many_keys'] } });
  });

  it('leaves other errors as they are', () => {
    const plain = problem({ name: ['Name the key.'] });
    expect(foldKeyErrors(plain)).toBe(plain);
    const other = new Error('offline');
    expect(foldKeyErrors(other)).toBe(other);
  });
});
