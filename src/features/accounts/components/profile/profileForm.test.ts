// Tests for the Profile form's helpers: what the boxes start with, how typed text is cleaned, and which fields count as changed. Ports the
// cases of the old merchant details helpers and the old customer input helpers (one form now serves every rank).
import { describe, expect, it } from 'vitest';
import { account, merchantAccount } from '../../test/fixtures';
import {
  cleanCountry,
  cleanEmail,
  profileBody,
  profileDefaults,
  tidyName,
  tooLong,
  validCountry,
  validEmail,
} from './profileForm';

const merchant = merchantAccount({
  phone: '+962 6 555 0100',
  address: 'Abdali Boulevard, Amman',
  taxId: 'JO-1234567',
  internalNotes: 'Pays on Sundays.',
});
const retail = account({ phone: '+44 7000 000', internalNotes: 'VIP' });

describe('profileDefaults', () => {
  it("starts with the account's own values", () => {
    expect(profileDefaults(merchant)).toEqual({
      name: 'Zain Mobile Hub',
      email: 'ops@zainmobilehub.example',
      phone: '+962 6 555 0100',
      country: 'JO',
      company: 'Zain Mobile Hub',
      address: 'Abdali Boulevard, Amman',
      taxId: 'JO-1234567',
      internalNotes: 'Pays on Sundays.',
    });
  });

  it('treats what the server did not send as empty', () => {
    const bare = { ...merchant, address: undefined, taxId: undefined, internalNotes: undefined };
    expect(profileDefaults(bare as never)).toMatchObject({ address: '', taxId: '', internalNotes: '' });
  });
});

describe('cleaning', () => {
  it('tidies a name and lower-cases an email', () => {
    expect(tidyName('  Pat   Example ')).toBe('Pat Example');
    expect(cleanEmail('  Pat.Example@Mail.example ')).toBe('pat.example@mail.example');
    expect(cleanCountry(' jo ')).toBe('JO');
  });

  it('checks the shape of an email, not whether it exists', () => {
    expect(validEmail('pat@mail.example')).toBe(true);
    expect(validEmail(' pat@mail.example ')).toBe(true);
    for (const bad of ['', 'pat', 'pat@', 'pat@mail', 'pa t@mail.example'])
      expect(validEmail(bad)).toBe(false);
  });

  it('wants two letters for a country', () => {
    expect(validCountry('jo')).toBe(true);
    expect(validCountry('JOR')).toBe(false);
    expect(validCountry('1a')).toBe(false);
  });

  it('flags a text longer than the server allows', () => {
    expect(tooLong('x'.repeat(41), 40)).toBe('Use at most 40 characters.');
    expect(tooLong('x'.repeat(40), 40)).toBeUndefined();
  });
});

describe('profileBody', () => {
  it('is empty when nothing changed, however the values are spaced or cased', () => {
    expect(profileBody(merchant, profileDefaults(merchant))).toEqual({});
    expect(
      profileBody(merchant, {
        ...profileDefaults(merchant),
        name: '  Zain   Mobile Hub ',
        email: 'OPS@zainmobilehub.example ',
        country: 'jo',
        address: ' Abdali Boulevard, Amman ',
      }),
    ).toEqual({});
  });

  it('sends only the fields that changed, cleaned', () => {
    expect(
      profileBody(merchant, {
        ...profileDefaults(merchant),
        name: ' Zain  Hub ',
        email: 'New@Zain.example',
        country: 'sa',
        taxId: '',
      }),
    ).toEqual({ name: 'Zain Hub', email: 'new@zain.example', country: 'SA', taxId: '' });
  });

  it('sends an emptied optional field as an empty string so the server clears it', () => {
    expect(profileBody(merchant, { ...profileDefaults(merchant), internalNotes: ' ', phone: '' })).toEqual({
      internalNotes: '',
      phone: '',
    });
  });

  it('lists the changed fields of a retail account, tidied', () => {
    expect(
      profileBody(retail, {
        ...profileDefaults(retail),
        internalNotes: ' Calls on Mondays ',
        name: 'Dan  Whitmore',
        country: 'IE',
        phone: '',
        email: 'Dan@mail.example',
      }),
    ).toEqual({
      name: 'Dan Whitmore',
      email: 'dan@mail.example',
      phone: '',
      country: 'IE',
      internalNotes: 'Calls on Mondays',
    });
  });

  it('ignores the case of the email and the spaces of a name, which change nothing', () => {
    expect(
      profileBody(retail, {
        ...profileDefaults(retail),
        name: '  Daniel   Whitmore ',
        email: 'DANIEL.WHITMORE@mail.example ',
      }),
    ).toEqual({});
  });

  it('never sends a locked email, whatever was typed', () => {
    expect(
      profileBody(
        retail,
        { ...profileDefaults(retail), email: 'other@mail.example', phone: '1' },
        { email: true },
      ),
    ).toEqual({ phone: '1' });
  });
});
