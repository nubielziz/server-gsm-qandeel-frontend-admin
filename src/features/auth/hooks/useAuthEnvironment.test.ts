// Tests for the facts on the sign-in screens: what each one is read from, how time and offset are written, and that
// the clock moves each minute.
import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { version } from '../../../../package.json';
import {
  describeEnvironment,
  formatLocalTime,
  formatUtcOffset,
  useAuthEnvironment,
} from './useAuthEnvironment';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.useRealTimers();
});

describe('formatUtcOffset', () => {
  it.each([
    [180, 'UTC+3'],
    [-300, 'UTC-5'],
    [330, 'UTC+5:30'],
    [-570, 'UTC-9:30'],
    [0, 'UTC+0'],
  ])('writes %i minutes as %s', (minutes, expected) => {
    expect(formatUtcOffset(minutes)).toBe(expected);
  });
});

describe('formatLocalTime', () => {
  it('writes the local date and time to the minute, then the offset from UTC', () => {
    // Built from local parts, so the expected text does not depend on the machine's time zone.
    const date = new Date(2026, 9, 5, 9, 7, 42);
    expect(formatLocalTime(date)).toBe(`2026-10-05 09:07 ${formatUtcOffset(-date.getTimezoneOffset())}`);
    expect(formatLocalTime(date)).toMatch(/^2026-10-05 09:07 UTC[+-]\d{1,2}(:\d{2})?$/);
  });
});

describe('describeEnvironment', () => {
  it('reads the mode, the API host and the package version', () => {
    vi.stubEnv('MODE', 'production');
    vi.stubEnv('VITE_API_MOCKS', 'false');
    vi.stubEnv('VITE_API_BASE_URL', 'https://api.gsm-supply.example:8443/');
    const facts = describeEnvironment(Date.now());
    expect(facts.env).toBe('production');
    expect(facts.api).toBe('api.gsm-supply.example:8443');
    expect(facts.build).toBe(`v${version}`);
    expect(facts.time).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2} UTC[+-]\d/);
  });

  it('says "mock data" when the dev mock layer is on', () => {
    vi.stubEnv('MODE', 'development');
    vi.stubEnv('VITE_API_MOCKS', 'true');
    expect(describeEnvironment(Date.now()).env).toBe('development · mock data');
  });

  it('says "same origin" when no API address is set', () => {
    vi.stubEnv('VITE_API_BASE_URL', '');
    expect(describeEnvironment(Date.now()).api).toBe('same origin');
    vi.stubEnv('VITE_API_BASE_URL', '/api');
    expect(describeEnvironment(Date.now()).api).toBe('same origin');
  });
});

describe('useAuthEnvironment', () => {
  it('moves the time on when the minute changes', () => {
    vi.useFakeTimers({ now: new Date(2026, 9, 30, 9, 59, 50) });
    const { result } = renderHook(() => useAuthEnvironment());
    expect(result.current.time).toMatch(/^2026-10-30 09:59 /);
    act(() => {
      vi.advanceTimersByTime(60_000);
    });
    expect(result.current.time).toMatch(/^2026-10-30 10:00 /);
  });
});
