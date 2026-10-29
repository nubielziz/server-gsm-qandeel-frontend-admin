// Tests for reading the server's check answer into the four reasons the screens show.
import { describe, expect, it } from 'vitest';
import type { IpRule } from '../types';
import { readVerdict } from './ipVerdict';

const rule = { id: 1, kind: 'block', cidr: '192.0.2.0/24' } as IpRule;

describe('readVerdict', () => {
  it('is blocked when the server refused and named a rule', () => {
    expect(readVerdict({ decision: 'refused', rule })).toEqual({ ok: false, why: 'blocked', rule });
  });

  it('is not listed when the server refused and named no rule', () => {
    expect(readVerdict({ decision: 'refused', rule: null })).toEqual({
      ok: false,
      why: 'not_listed',
      rule: null,
    });
  });

  it('is allowed by a rule when the server allowed and named one', () => {
    const allow = { ...rule, kind: 'allow' } as IpRule;
    expect(readVerdict({ decision: 'allowed', rule: allow })).toEqual({
      ok: true,
      why: 'allowed',
      rule: allow,
    });
  });

  it('is open when the server allowed and no rule applies', () => {
    expect(readVerdict({ decision: 'allowed', rule: null })).toEqual({ ok: true, why: 'open', rule: null });
  });
});
