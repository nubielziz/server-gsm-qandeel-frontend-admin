// Tests for the words and rules of the whole-groups path of the Add services flow: the step each stage shows, when the shop switch is
// locked and when it is on, how the rules are described and what a refused start says. Pure functions; the dialog has its own test.
import { describe, expect, it } from 'vitest';
import { ApiError } from '@/lib/api';
import {
  NO_RULE_REASON,
  RULE_LOADING_REASON,
  refusalText,
  ruleLine,
  shopSwitch,
  shopSwitchLock,
  stepOf,
  type ShopRule,
} from './quickAddFlow';
import { PUBLISH_NEEDS_PERMISSION, PUBLISH_SWITCHED_OFF } from './quickAddPublish';

const usable = { serviceStatus: 'active', canPublish: true, rule: 'active', choice: null } as const;

describe('the step of a stage', () => {
  it('shows picking as the second step and the last two stages as the third', () => {
    expect(stepOf('prices')).toBe('prices');
    expect(stepOf('finish')).toBe('finish');
    expect(stepOf('progress')).toBe('finish');
  });
});

describe('the lock of the shop switch', () => {
  it('is open for services added on sale, to a role that may publish, with a rule active', () => {
    expect(shopSwitchLock(usable)).toBeUndefined();
  });

  it('gives the reason in words: switched off first, then the permission, then the rules', () => {
    expect(shopSwitchLock({ ...usable, serviceStatus: 'disabled', canPublish: false, rule: 'none' })).toBe(
      PUBLISH_SWITCHED_OFF,
    );
    expect(shopSwitchLock({ ...usable, canPublish: false, rule: 'none' })).toBe(PUBLISH_NEEDS_PERMISSION);
    expect(shopSwitchLock({ ...usable, rule: 'none' })).toBe(NO_RULE_REASON);
    expect(shopSwitchLock({ ...usable, rule: 'loading' })).toBe(RULE_LOADING_REASON);
  });

  it('does not lock for a rule that cannot be read: the server checks it at the start', () => {
    expect(shopSwitchLock({ ...usable, rule: 'unknown' })).toBeUndefined();
  });
});

describe('the shop switch', () => {
  it('is on by default when it can be used and a rule is active', () => {
    expect(shopSwitch(usable)).toEqual({ checked: true, lock: undefined });
  });

  it('is off by default when it is not known that a rule is active', () => {
    expect(shopSwitch({ ...usable, rule: 'unknown' })).toEqual({ checked: false, lock: undefined });
  });

  it('follows the choice of the person while it can be used', () => {
    expect(shopSwitch({ ...usable, choice: false }).checked).toBe(false);
    expect(shopSwitch({ ...usable, rule: 'unknown', choice: true }).checked).toBe(true);
  });

  it('is off and locked, whatever was chosen, when it cannot be used', () => {
    expect(shopSwitch({ ...usable, choice: true, serviceStatus: 'disabled' })).toEqual({
      checked: false,
      lock: PUBLISH_SWITCHED_OFF,
    });
    expect(shopSwitch({ ...usable, choice: true, rule: 'none' })).toEqual({
      checked: false,
      lock: NO_RULE_REASON,
    });
    expect(shopSwitch({ ...usable, choice: true, canPublish: false })).toEqual({
      checked: false,
      lock: PUBLISH_NEEDS_PERMISSION,
    });
  });
});

describe('the line about the shop price rules', () => {
  it('says something different for each thing that is known', () => {
    const rules: ShopRule[] = ['active', 'none', 'loading', 'unknown'];
    const lines = rules.map(ruleLine);
    expect(new Set(lines).size).toBe(4);
    for (const line of lines) expect(line).toMatch(/^Shop price: set by the shop price rules\./);
    expect(ruleLine('active')).toContain('A rule is active.');
    expect(ruleLine('none')).toContain('nothing can go on the shop until one is made');
  });
});

describe('what a refused start says', () => {
  it('is the first field message of the server, else the text of the error', () => {
    const field = new ApiError({ status: 422, fieldErrors: { scope: ['Nothing to add.'] } });
    expect(refusalText(field)).toBe('Nothing to add.');
    expect(refusalText(new ApiError({ status: 409, detail: 'A quick add is already running.' }))).toBe(
      'A quick add is already running.',
    );
    expect(refusalText(new Error('Boom'))).toBe('Boom');
  });
});
