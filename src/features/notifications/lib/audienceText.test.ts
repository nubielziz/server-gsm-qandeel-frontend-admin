// Tests for the words of the audience and the live count: one line per group, names or counts for roles and groups, and a sentence per exclusion.
import { describe, expect, it } from 'vitest';
import {
  audienceLines,
  audienceSummary,
  byChannelText,
  byTypeText,
  exclusionLines,
  plannedText,
  plural,
  sentenceList,
  skippedLines,
} from './audienceText';

describe('small helpers', () => {
  it('builds lists and plurals', () => {
    expect(sentenceList([])).toBe('');
    expect(sentenceList(['A'])).toBe('A');
    expect(sentenceList(['A', 'B'])).toBe('A and B');
    expect(sentenceList(['A', 'B', 'C'])).toBe('A, B and C');
    expect(plural(1, 'person', 'people')).toBe('1 person');
    expect(plural(1204, 'customer', 'customers')).toBe('1,204 customers');
  });
});

describe('the audience in words', () => {
  it('says all of each group that is targeted and nothing about the others', () => {
    expect(audienceLines({ staff: {}, merchants: {}, customers: { hasAccount: true } })).toEqual([
      { label: 'Staff', text: 'All active staff' },
      { label: 'Merchants', text: 'Active merchants' },
      { label: 'Customers', text: 'Customers with an account' },
    ]);
    expect(audienceLines({ customers: {} })).toEqual([{ label: 'Customers', text: 'All active customers' }]);
  });

  it('names roles and groups when it knows them and counts them when it does not', () => {
    const spec = {
      staff: { roleIds: [1, 2] },
      merchants: {
        groupIds: [3],
        statuses: ['active' as const, 'pending' as const],
        countries: ['JO', 'SA'],
      },
    };
    const names = {
      roles: new Map([
        [1, 'Owner'],
        [2, 'Support'],
      ]),
      groups: new Map([[3, 'Gold']]),
    };
    expect(audienceLines(spec, names)).toEqual([
      { label: 'Staff', text: 'Active staff with the role Owner and Support' },
      { label: 'Merchants', text: 'Active and pending merchants in Gold from JO and SA' },
    ]);
    expect(audienceLines(spec)[0].text).toBe('Active staff with the role 2 roles');
  });

  it('describes guests, countries, added and left-out people', () => {
    expect(
      audienceLines({
        customers: { hasAccount: false, countries: ['JO'] },
        include: [
          { type: 'staff', id: 1 },
          { type: 'client', id: 2 },
        ],
        exclude: [{ type: 'customer', id: 3 }],
      }),
    ).toEqual([
      { label: 'Customers', text: 'Guest customers from JO' },
      { label: 'Added', text: '2 people' },
      { label: 'Left out', text: '1 person' },
    ]);
  });

  it('summarises in one sentence, and says when nobody is chosen', () => {
    expect(audienceSummary({ staff: {} })).toBe('Staff: All active staff');
    expect(audienceSummary({})).toBe('Nobody chosen yet');
  });
});

describe('the live count in words', () => {
  it('says who is left out and why, only for the reasons that apply', () => {
    expect(exclusionLines({ noConsent: 1204, optedOut: 1, noTelegram: 0, noAccount: 2 })).toEqual([
      '1,204 customers did not agree to marketing',
      '1 person has switched announcement emails off',
      '2 customers have no account, so no inbox',
    ]);
    expect(exclusionLines({ noConsent: 0, optedOut: 0, noTelegram: 0, noAccount: 0 })).toEqual([]);
  });

  it('breaks the reach down by kind and channel', () => {
    expect(byTypeText({ staff: 6, client: 402, customer: 800 })).toBe(
      '6 staff, 402 merchants and 800 customers',
    );
    expect(byTypeText({ staff: 0, client: 0, customer: 1 })).toBe('1 customer');
    expect(byChannelText({ inApp: 1208, email: 1190, telegram: 0 }, ['in_app', 'email'])).toBe(
      '1,208 in the app and 1,190 by email',
    );
  });

  it('says what the fan-out planned and skipped', () => {
    expect(plannedText({ inApp: 12, email: 10, telegram: 0 })).toBe('12 in-app, 10 email');
    expect(plannedText({ inApp: 0, email: 0, telegram: 0 })).toBe('No messages planned');
    expect(skippedLines({ optedOut: 2, noTelegram: 1, noAccount: 0 })).toEqual([
      '2 people have switched announcement emails off',
      '1 merchant has no Telegram chat linked, or switched it off',
    ]);
  });
});
