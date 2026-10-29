// Tests for the IP parsing and matching helpers (ports of parseIp and ipIn in 14-state-access.js).
import { describe, expect, it } from 'vitest';
import { IPV4, ipIn, isIpError, parseIp } from './ip';

describe('IPV4', () => {
  it('matches four groups of one to three digits and nothing else', () => {
    expect(IPV4.test('203.0.113.24')).toBe(true);
    expect(IPV4.test('1.2.3')).toBe(false);
    expect(IPV4.test('1.2.3.4.5')).toBe(false);
    expect(IPV4.test('1.2.3.1234')).toBe(false);
  });
});

describe('parseIp', () => {
  it('reads a single IPv4 address, ignoring spaces', () => {
    expect(parseIp(' 203.0.113.24 ')).toEqual({
      v: 4,
      base: 3405803800,
      mask: 4294967295,
      bits: 32,
      text: '203.0.113.24',
    });
  });

  it('normalises a range to its first address', () => {
    expect(parseIp('203.0.113.77/24')).toMatchObject({
      v: 4,
      bits: 24,
      mask: 4294967040,
      text: '203.0.113.0/24',
    });
    expect(parseIp('10.1.2.3/0')).toMatchObject({ bits: 0, mask: 0, text: '0.0.0.0/0' });
    expect(parseIp('198.51.100.255/32')).toMatchObject({ bits: 32, text: '198.51.100.255' });
  });

  it('reads an IPv6 address as lower-case text', () => {
    expect(parseIp('2001:DB8::1')).toEqual({ v: 6, text: '2001:db8::1' });
    expect(parseIp('::1')).toEqual({ v: 6, text: '::1' });
  });

  it('says in plain words what is wrong', () => {
    const error = (raw: unknown) => {
      const parsed = parseIp(raw);
      return isIpError(parsed) ? parsed.error : undefined;
    };
    expect(error('')).toBe('Enter an IP address or a range.');
    expect(error('   ')).toBe('Enter an IP address or a range.');
    expect(error(undefined)).toBe('Enter an IP address or a range.');
    expect(error('256.1.1.1')).toBe('Each part of an IPv4 address is 0 to 255.');
    expect(error('1.2.3.4/33')).toBe('The number after the slash is 0 to 32, like /24.');
    expect(error('1.2.3.4/x')).toBe('The number after the slash is 0 to 32, like /24.');
    const shape = 'Enter an IPv4 address like 203.0.113.24, or a range like 203.0.113.0/24.';
    expect(error('1.2.3/24')).toBe(shape);
    expect(error('hello')).toBe(shape);
    expect(error('1.2.3.4/24/5')).toBe(shape);
    // IPv6 ranges are not supported, only single addresses.
    expect(error('2001:db8::/32')).toBe(shape);
  });
});

describe('ipIn', () => {
  it('matches an address inside a range, and only inside it', () => {
    expect(ipIn('203.0.113.0/24', '203.0.113.77')).toBe(true);
    expect(ipIn('203.0.113.0/24', '203.0.114.1')).toBe(false);
    expect(ipIn('203.0.113.24', '203.0.113.24')).toBe(true);
    expect(ipIn('203.0.113.24', '203.0.113.25')).toBe(false);
    expect(ipIn('0.0.0.0/0', '8.8.8.8')).toBe(true);
  });

  it('takes the first address of a range when a range is tested', () => {
    expect(ipIn('203.0.113.0/24', '203.0.113.128/25')).toBe(true);
  });

  it('never mixes IP versions, and matches IPv6 only as the same address', () => {
    expect(ipIn('203.0.113.0/24', '2001:db8::1')).toBe(false);
    expect(ipIn('2001:db8::1', '2001:DB8::1')).toBe(true);
    expect(ipIn('2001:db8::1', '2001:db8::2')).toBe(false);
  });

  it('is false when either side cannot be read', () => {
    expect(ipIn('bad', '1.2.3.4')).toBe(false);
    expect(ipIn('1.2.3.4', 'bad')).toBe(false);
  });
});
