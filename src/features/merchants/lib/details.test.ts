// Tests for the merchant details helpers: what the dialog starts with, and which fields count as changed.
import { describe, expect, it } from 'vitest';
import { changedDetails, detailDefaults, tidyName, tooLong } from './details';

const client = {
  name: 'Zain Mobile Hub',
  company: 'Zain Mobile Hub',
  email: 'ops@zainmobilehub.example',
  phone: '+962 6 555 0100',
  country: 'JO',
  address: 'Abdali Boulevard, Amman',
  taxId: 'JO-1234567',
  internalNotes: 'Pays on Sundays.',
};

describe('detailDefaults', () => {
  it('starts with the merchant’s own values', () => {
    expect(detailDefaults(client)).toEqual(client);
  });

  it('treats what the server did not send as empty', () => {
    expect(
      detailDefaults({
        ...client,
        address: undefined,
        taxId: undefined,
        internalNotes: undefined,
      }),
    ).toMatchObject({
      address: '',
      taxId: '',
      internalNotes: '',
    });
  });
});

describe('changedDetails', () => {
  it('is empty when nothing changed, however the values are spaced or cased', () => {
    expect(changedDetails(client, detailDefaults(client))).toEqual({});
    expect(
      changedDetails(client, {
        ...detailDefaults(client),
        name: '  Zain   Mobile Hub ',
        email: 'OPS@zainmobilehub.example ',
        country: 'jo',
        address: ' Abdali Boulevard, Amman ',
      }),
    ).toEqual({});
  });

  it('sends only the fields that changed, cleaned', () => {
    expect(
      changedDetails(client, {
        ...detailDefaults(client),
        name: ' Zain  Hub ',
        email: 'New@Zain.example',
        country: 'sa',
        taxId: '',
      }),
    ).toEqual({ name: 'Zain Hub', email: 'new@zain.example', country: 'SA', taxId: '' });
  });

  it('sends an emptied optional field as an empty string so the server clears it', () => {
    expect(changedDetails(client, { ...detailDefaults(client), internalNotes: ' ', phone: '' })).toEqual({
      internalNotes: '',
      phone: '',
    });
  });
});

describe('text helpers', () => {
  it('tidies names and flags a text that is too long', () => {
    expect(tidyName('  a   b ')).toBe('a b');
    expect(tooLong('x'.repeat(41), 40)).toBe('Use at most 40 characters.');
    expect(tooLong('x'.repeat(40), 40)).toBeUndefined();
  });
});
