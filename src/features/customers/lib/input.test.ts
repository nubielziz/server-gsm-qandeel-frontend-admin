// Tests for the customer dialogs' input helpers: tidying a name and an email, the email shape check, and which fields of an edit
// really changed (so a save with no change sends nothing).
import { describe, expect, it } from 'vitest';
import { customer } from '../test/fixtures';
import { changedFields, cleanEmail, cleanName, validEmail, type EditValues } from './input';

const unchanged = (): EditValues => {
  const c = customer({ phone: '+44 7000 000', internalNotes: 'VIP' });
  return {
    name: c.name,
    email: c.email,
    country: c.country,
    locale: c.locale,
    phone: c.phone,
    internalNotes: c.internalNotes,
  };
};
const base = () => customer({ phone: '+44 7000 000', internalNotes: 'VIP' });

describe('cleaning', () => {
  it('tidies a name and lower-cases an email', () => {
    expect(cleanName('  Pat   Example ')).toBe('Pat Example');
    expect(cleanEmail('  Pat.Example@Mail.example ')).toBe('pat.example@mail.example');
  });

  it('checks the shape of an email, not whether it exists', () => {
    expect(validEmail('pat@mail.example')).toBe(true);
    expect(validEmail(' pat@mail.example ')).toBe(true);
    for (const bad of ['', 'pat', 'pat@', 'pat@mail', 'pat@mail.x', 'pa t@mail.example']) {
      expect(validEmail(bad)).toBe(false);
    }
  });
});

describe('changedFields', () => {
  it('is empty when nothing changed', () => {
    expect(changedFields(base(), unchanged())).toEqual({});
  });

  it('ignores spaces and the case of the email, which change nothing', () => {
    expect(
      changedFields(base(), {
        ...unchanged(),
        name: '  Daniel   Whitmore ',
        email: 'DANIEL.WHITMORE@mail.example ',
      }),
    ).toEqual({});
  });

  it('lists only the fields that differ, in the demo’s order, tidied', () => {
    expect(
      changedFields(base(), {
        ...unchanged(),
        internalNotes: ' Calls on Mondays ',
        name: 'Dan  Whitmore',
        country: 'IE',
        locale: 'ar',
        phone: '',
        email: 'Dan@mail.example',
      }),
    ).toEqual({
      name: 'Dan Whitmore',
      email: 'dan@mail.example',
      country: 'IE',
      locale: 'ar',
      phone: '',
      internalNotes: 'Calls on Mondays',
    });
  });
});
