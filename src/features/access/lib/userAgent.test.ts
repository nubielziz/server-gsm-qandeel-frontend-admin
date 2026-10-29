// Tests for the short device names in the sessions table.
import { describe, expect, it } from 'vitest';
import { describeUserAgent } from './userAgent';

const AGENTS = {
  chromeWindows:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  edgeWindows:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0',
  safariMac:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15',
  firefoxLinux: 'Mozilla/5.0 (X11; Linux x86_64; rv:121.0) Gecko/20100101 Firefox/121.0',
  safariIphone:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1',
  chromeAndroid:
    'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36',
};

describe('describeUserAgent', () => {
  it.each([
    ['chromeWindows', 'Chrome on Windows'],
    ['edgeWindows', 'Edge on Windows'],
    ['safariMac', 'Safari on macOS'],
    ['firefoxLinux', 'Firefox on Linux'],
    ['safariIphone', 'Safari on iOS'],
    ['chromeAndroid', 'Chrome on Android'],
  ] as const)('reads %s', (name, expected) => {
    expect(describeUserAgent(AGENTS[name])).toBe(expected);
  });

  it('knows a command-line client without a system', () => {
    expect(describeUserAgent('curl/8.4.0')).toBe('curl');
  });

  it('shows an unknown agent cut to length, and says so when there is none', () => {
    const long = 'x'.repeat(80);
    expect(describeUserAgent(long)).toHaveLength(48);
    expect(describeUserAgent('Custom/1.0')).toBe('Custom/1.0');
    expect(describeUserAgent('')).toBe('Unknown device');
    expect(describeUserAgent(null)).toBe('Unknown device');
  });
});
