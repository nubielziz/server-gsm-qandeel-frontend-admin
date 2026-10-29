// Tests for the IP rule hints (ports of the checks in addIpRule, removeIpRule and setAccessRestrict).
import { describe, expect, it } from 'vitest';
import type { IpRule } from '../types';
import { isAllowed, readIpRuleInput, removeRuleGuard, turnOnGuard } from './ipGuards';

const NOW = Date.parse('2026-01-01T12:00:00Z');
const MINE = '203.0.113.24';

function rule(overrides: Partial<IpRule>): IpRule {
  return {
    id: 1,
    kind: 'allow',
    scope: 'admin',
    cidr: MINE,
    label: '',
    reason: '',
    source: 'manual',
    expiresAt: null,
    hitCount: 0,
    lastHitAt: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    createdBy: null,
    ...overrides,
  };
}

describe('readIpRuleInput', () => {
  const base = { kind: 'block', scope: 'store', myIp: MINE } as const;

  it('gives the normalised range for a good address', () => {
    expect(readIpRuleInput({ ...base, raw: ' 198.51.100.7/24 ' })).toEqual({ cidr: '198.51.100.0/24' });
  });

  it('passes on the shape error of the parser', () => {
    expect(readIpRuleInput({ ...base, raw: 'nope' })).toEqual({
      error: 'Enter an IPv4 address like 203.0.113.24, or a range like 203.0.113.0/24.',
    });
    expect(readIpRuleInput({ ...base, raw: '' })).toEqual({ error: 'Enter an IP address or a range.' });
  });

  it('refuses a range wider than /16 and says how many addresses it holds', () => {
    expect(readIpRuleInput({ ...base, raw: '10.0.0.0/8' })).toEqual({
      error: 'That range is too wide (16,777,216 addresses). Use /16 or narrower.',
    });
    expect(readIpRuleInput({ ...base, raw: '10.0.0.0/16' })).toEqual({ cidr: '10.0.0.0/16' });
  });

  it('refuses a block that reaches the console and includes your own address', () => {
    const own = `This includes your own address (${MINE}). You would lock yourself out of the console.`;
    expect(readIpRuleInput({ ...base, scope: 'admin', raw: '203.0.113.0/24' })).toEqual({ error: own });
    expect(readIpRuleInput({ ...base, scope: 'all', raw: MINE })).toEqual({ error: own });
  });

  it('lets through the same range for the storefront, for an allow rule, or when your address is unknown', () => {
    expect(readIpRuleInput({ ...base, scope: 'store', raw: '203.0.113.0/24' })).toEqual({
      cidr: '203.0.113.0/24',
    });
    expect(readIpRuleInput({ ...base, kind: 'allow', scope: 'admin', raw: '203.0.113.0/24' })).toEqual({
      cidr: '203.0.113.0/24',
    });
    expect(readIpRuleInput({ ...base, scope: 'admin', raw: MINE, myIp: null })).toEqual({ cidr: MINE });
  });
});

describe('isAllowed', () => {
  it('counts only live allowed rules that cover the address', () => {
    const rules = [
      rule({ id: 1, cidr: '203.0.113.0/24', expiresAt: new Date(NOW - 1000).toISOString() }),
      rule({ id: 2, cidr: '198.51.100.0/24' }),
    ];
    expect(isAllowed(rules, MINE, NOW)).toBe(false);
    expect(isAllowed(rules, '198.51.100.9', NOW)).toBe(true);
  });
});

describe('removeRuleGuard', () => {
  const mine = rule({ id: 1, cidr: MINE });
  const other = rule({ id: 2, cidr: '198.51.100.0/24' });
  const REASON =
    'This is the rule that lets you in right now. Add another one that covers your address first, or turn the restriction off.';

  it('refuses to remove the only rule that covers you while the restriction is on', () => {
    expect(
      removeRuleGuard({ rule: mine, allowRules: [mine, other], restricted: true, myIp: MINE, now: NOW }),
    ).toEqual({
      ok: false,
      reason: REASON,
    });
  });

  it('allows it when another live rule also covers you', () => {
    const second = rule({ id: 3, cidr: '203.0.113.0/24' });
    expect(
      removeRuleGuard({ rule: mine, allowRules: [mine, second], restricted: true, myIp: MINE, now: NOW }),
    ).toEqual({
      ok: true,
    });
  });

  it('allows it when the restriction is off, for a rule that does not cover you, or for a block', () => {
    expect(
      removeRuleGuard({ rule: mine, allowRules: [mine], restricted: false, myIp: MINE, now: NOW }).ok,
    ).toBe(true);
    expect(
      removeRuleGuard({ rule: other, allowRules: [mine, other], restricted: true, myIp: MINE, now: NOW }).ok,
    ).toBe(true);
    const block = rule({ id: 4, kind: 'block', cidr: MINE });
    expect(removeRuleGuard({ rule: block, allowRules: [], restricted: true, myIp: MINE, now: NOW }).ok).toBe(
      true,
    );
    expect(
      removeRuleGuard({ rule: mine, allowRules: [mine], restricted: true, myIp: null, now: NOW }).ok,
    ).toBe(true);
  });
});

describe('turnOnGuard', () => {
  it('asks you to add your own address first when no live rule covers it', () => {
    expect(turnOnGuard({ allowRules: [rule({ cidr: '198.51.100.1' })], myIp: MINE, now: NOW })).toEqual({
      ok: false,
      reason: `Your own address (${MINE}) is not on the list, so turning this on would lock you out. Add it first.`,
    });
  });

  it('lets it through when your address is covered or unknown', () => {
    expect(turnOnGuard({ allowRules: [rule({ cidr: '203.0.113.0/24' })], myIp: MINE, now: NOW }).ok).toBe(
      true,
    );
    expect(turnOnGuard({ allowRules: [], myIp: null, now: NOW }).ok).toBe(true);
  });
});
