// Tests for the IP rule labels, durations and time helpers (ports of IP_SCOPE, IP_DURATIONS, durText, ipLive, IP_LEFT).
import { describe, expect, it } from 'vitest';
import type { IpRule } from '../types';
import {
  ageText,
  ALLOW_DURATIONS,
  BLOCK_SCOPE_OPTS,
  durText,
  expiresAtFor,
  IP_DURATIONS,
  IP_RULE_SORT,
  IP_SCOPE,
  IP_SCOPE_TAG,
  isLive,
  isRange,
  leftText,
  liveRules,
} from './ipRules';

const NOW = Date.parse('2026-01-01T12:00:00Z');
const HOUR = 3_600_000;

function rule(overrides: Partial<IpRule>): IpRule {
  return {
    id: 1,
    kind: 'block',
    scope: 'all',
    cidr: '192.0.2.0/24',
    label: '',
    reason: 'test',
    source: 'manual',
    expiresAt: null,
    hitCount: 0,
    lastHitAt: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    createdBy: null,
    ...overrides,
  };
}

describe('labels', () => {
  it('names every scope in a sentence and as a short tag', () => {
    expect(IP_SCOPE).toEqual({
      store: 'Customers (storefront)',
      api: 'Merchants (API)',
      admin: 'Admins (console)',
      all: 'Everywhere',
    });
    expect(IP_SCOPE_TAG).toEqual({
      store: 'Storefront',
      api: 'Merchant API',
      admin: 'Admin console',
      all: 'Everywhere',
    });
  });

  it('offers the demo durations, and no one-hour option for allowed addresses', () => {
    expect(IP_DURATIONS.map((option) => [option.value, option.label])).toEqual([
      ['0', 'Until I remove it'],
      ['1', '1 hour'],
      ['24', '24 hours'],
      ['168', '7 days'],
      ['720', '30 days'],
    ]);
    expect(ALLOW_DURATIONS.map((option) => option.value)).toEqual(['0', '24', '168', '720']);
    expect(BLOCK_SCOPE_OPTS.map((option) => option.value)).toEqual(['store', 'api', 'admin', 'all']);
  });
});

describe('durText', () => {
  it('uses words for the named durations and hours for anything else', () => {
    expect(durText(1)).toBe('1 hour');
    expect(durText(24)).toBe('24 hours');
    expect(durText(168)).toBe('7 days');
    expect(durText(720)).toBe('30 days');
    expect(durText(5)).toBe('5 hours');
  });
});

describe('expiry', () => {
  it('turns a number of hours into an end time, and zero into none', () => {
    expect(expiresAtFor(0, NOW)).toBeUndefined();
    expect(expiresAtFor(24, NOW)).toBe('2026-01-02T12:00:00.000Z');
  });

  it('keeps a rule live until its end time and hides it after', () => {
    expect(isLive(rule({ expiresAt: null }), NOW)).toBe(true);
    expect(isLive(rule({ expiresAt: new Date(NOW + HOUR).toISOString() }), NOW)).toBe(true);
    expect(isLive(rule({ expiresAt: new Date(NOW - HOUR).toISOString() }), NOW)).toBe(false);
  });

  it('lists the live rules of one kind', () => {
    const rules = [
      rule({ id: 1, kind: 'allow' }),
      rule({ id: 2, kind: 'block' }),
      rule({ id: 3, kind: 'block', expiresAt: new Date(NOW - HOUR).toISOString() }),
    ];
    expect(liveRules(rules, 'block', NOW).map((r) => r.id)).toEqual([2]);
    expect(liveRules(rules, 'allow', NOW).map((r) => r.id)).toEqual([1]);
  });

  it('says how long is left in the two largest units', () => {
    const gap = ' ';
    expect(ageText(10_000)).toBe('<1m');
    expect(ageText(-5_000)).toBe('<1m');
    expect(ageText(5 * 60_000)).toBe('5m');
    expect(ageText(2 * HOUR)).toBe('2h');
    expect(ageText(2 * HOUR + 5 * 60_000)).toBe(`2h${gap}5m`);
    expect(ageText(24 * HOUR)).toBe('1d');
    expect(ageText(76 * HOUR)).toBe(`3d${gap}4h`);
  });

  it('shows the time left for a temporary rule and nothing for one that lasts', () => {
    expect(leftText({ expiresAt: null }, NOW)).toBeNull();
    expect(leftText({ expiresAt: new Date(NOW + 2 * HOUR).toISOString() }, NOW)).toBe('in 2h');
  });
});

describe('isRange and the sort values', () => {
  it('tells a range from a single address', () => {
    expect(isRange('203.0.113.0/24')).toBe(true);
    expect(isRange('203.0.113.24')).toBe(false);
  });

  it('sorts a rule that never expires after every one that does', () => {
    const forever = rule({ expiresAt: null });
    const soon = rule({ expiresAt: new Date(NOW + HOUR).toISOString() });
    expect(IP_RULE_SORT.lasts(forever)).toBeGreaterThan(IP_RULE_SORT.lasts(soon) as number);
  });
});
