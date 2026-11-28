// Tests for the calling-code data and the phone helpers (the same rules as the shop's website).
import { describe, expect, it } from 'vitest';
import { ISO_COUNTRY_CODES } from '@/lib/isoCountries';
import {
  dialCountryRows,
  dialLabel,
  internationalDigits,
  isOnlyDialCode,
  phoneCountry,
  searchCountries,
  typedPhone,
  withCountry,
} from './dial';
import { CALLING_CODES, SHARED_CODES } from './dialData';

describe('the calling-code data', () => {
  it('has a code for every country of the list, apart from the seven that have no numbering', () => {
    const without = ISO_COUNTRY_CODES.filter((code) => !CALLING_CODES[code]);
    expect(without).toEqual(['AQ', 'BV', 'GS', 'HM', 'PN', 'TF', 'UM']);
    for (const code of Object.values(CALLING_CODES)) expect(code).toMatch(/^[1-9]\d{0,2}$/);
  });

  it('never has a code that starts another (so a number has one reading)', () => {
    const codes = [...new Set(Object.values(CALLING_CODES))];
    for (const a of codes)
      for (const b of codes) if (a !== b) expect(b.startsWith(a), `${a} starts ${b}`).toBe(false);
  });

  it('lists under a shared code exactly the countries that use it', () => {
    for (const [code, rows] of Object.entries(SHARED_CODES)) {
      const users = Object.keys(CALLING_CODES).filter((country) => CALLING_CODES[country] === code);
      expect(rows.map(([country]) => country).sort()).toEqual(users.sort());
    }
  });
});

describe('internationalDigits', () => {
  it('reads + and 00 numbers, whatever separates the digits', () => {
    expect(internationalDigits('+962 79 123-4567')).toBe('962791234567');
    expect(internationalDigits('00962 (79) 1234567')).toBe('962791234567');
    expect(internationalDigits('+')).toBe('');
  });

  it('gives null for a local number and for nothing', () => {
    expect(internationalDigits('0791234567')).toBeNull();
    expect(internationalDigits('')).toBeNull();
  });
});

describe('phoneCountry', () => {
  it('names the country of a calling code as soon as the code is typed', () => {
    expect(phoneCountry('+962')).toBe('JO');
    expect(phoneCountry('+962 79 123 4567')).toBe('JO');
    expect(phoneCountry('0044 20 7946 0000')).toBe('GB');
    expect(phoneCountry('+20 12 10230575')).toBe('EG');
  });

  it('names none for a local number, an empty box, a lone + or a code no country has', () => {
    for (const value of ['', '+', '0791234567', '791234567', '+0', '+999 1'])
      expect(phoneCountry(value), value).toBeNull();
  });

  it('tells the countries of a shared code apart by the start of the number', () => {
    expect(phoneCountry('+1 242 555 0100')).toBe('BS');
    expect(phoneCountry('+1 416 555 0100')).toBe('CA');
    expect(phoneCountry('+1 809 555 0100')).toBe('DO');
    expect(phoneCountry('+1 202 555 0100')).toBe('US');
    expect(phoneCountry('+7 701 000 0000')).toBe('KZ');
    expect(phoneCountry('+7 912 000 0000')).toBe('RU');
    expect(phoneCountry('+44 1481 000000')).toBe('GG');
    expect(phoneCountry('+44 20 7946 0000')).toBe('GB');
  });

  it('lets the hint decide only while the number cannot', () => {
    expect(phoneCountry('+1', 'CA')).toBe('CA');
    expect(phoneCountry('+1 20', 'CA')).toBe('CA');
    // A full area code that is not Canada's is the main country's, whatever the hint.
    expect(phoneCountry('+1 202 555 0100', 'CA')).toBe('US');
    expect(phoneCountry('+61 400 000 000', 'CX')).toBe('CX');
    expect(phoneCountry('+61 400 000 000')).toBe('AU');
    // A hint that does not use the code is ignored.
    expect(phoneCountry('+962 79', 'US')).toBe('JO');
    expect(phoneCountry('+7 912', 'KZ')).toBe('RU');
  });

  it('reads digits typed on an Arabic keyboard', () => {
    expect(phoneCountry('+\u0669\u0666\u0662 \u0667\u0669')).toBe('JO');
  });
});

describe('dialLabel', () => {
  it('shows the code, with the area code of a country that has its own', () => {
    expect(dialLabel('JO')).toBe('+962');
    expect(dialLabel('jo')).toBe('+962');
    expect(dialLabel('US')).toBe('+1');
    expect(dialLabel('BS')).toBe('+1 242');
    // A single leading digit is the start of a number, not an area code.
    expect(dialLabel('KZ')).toBe('+7');
    expect(dialLabel('AQ')).toBeNull();
  });
});

describe('isOnlyDialCode', () => {
  it('is true for nothing, a lone + and a calling code with no number', () => {
    for (const value of ['', '  ', '+', '00', '+962', '+962 ', '+1', '+1 242 '])
      expect(isOnlyDialCode(value), value).toBe(true);
  });

  it('is false as soon as a number follows, and for a local number', () => {
    for (const value of ['+962 7', '+1 2', '0791234567', '7', '+999'])
      expect(isOnlyDialCode(value), value).toBe(false);
  });
});

describe('withCountry', () => {
  it('writes the code into an empty box', () => {
    expect(withCountry('', 'JO')).toBe('+962 ');
    expect(withCountry('+', 'jo')).toBe('+962 ');
    expect(withCountry('', 'BS')).toBe('+1 242 ');
    expect(withCountry('', 'KZ')).toBe('+7 ');
  });

  it('replaces the calling code of a number and keeps the number', () => {
    expect(withCountry('+1 202 555 0100', 'GB')).toBe('+44 2025550100');
    expect(withCountry('00962 79 123 4567', 'EG')).toBe('+20 791234567');
    expect(withCountry('+1 242 555 0100', 'JO')).toBe('+962 5550100');
    expect(withCountry('+9', 'JO')).toBe('+962 ');
  });

  it('puts the code before a local number, dropping the leading 0 where numbers are dialled with one', () => {
    expect(withCountry('079 123 4567', 'JO')).toBe('+962 791234567');
    expect(withCountry('791234567', 'JO')).toBe('+962 791234567');
    // Italy keeps its 0; the United States has no 0 to drop.
    expect(withCountry('06 1234 5678', 'IT')).toBe('+39 0612345678');
    expect(withCountry('202 555 0100', 'US')).toBe('+1 2025550100');
  });

  it('leaves the value alone for a country without a calling code', () => {
    expect(withCountry('+962 79', 'AQ')).toBe('+962 79');
  });

  it("gives a number the form's own checks accept and whose country is the chosen one", () => {
    const value = withCountry('0791234567', 'JO');
    expect(phoneCountry(value)).toBe('JO');
    expect(value.replace(/\s/g, '')).toMatch(/^\+\d{7,15}$/);
  });
});

describe("the phone box's list", () => {
  it('has every country with a calling code, each with its code', () => {
    const rows = dialCountryRows();
    // Kosovo (XK) has a calling code but is not one of the 249 assigned ISO codes the console lists.
    expect(rows).toHaveLength(ISO_COUNTRY_CODES.filter((code) => CALLING_CODES[code]).length);
    expect(rows.find((row) => row.code === 'JO')).toEqual({ code: 'JO', name: 'Jordan', detail: '+962' });
    expect(rows.some((row) => row.code === 'AQ')).toBe(false);
  });
});

describe('searchCountries', () => {
  const rows = [
    { code: 'JO', name: 'Jordan', detail: '+962' },
    { code: 'US', name: 'United States', detail: '+1' },
    { code: 'AE', name: 'United Arab Emirates', detail: '+971' },
    { code: 'AX', name: '\u00c5land Islands', detail: '+358 18' },
    { code: 'SA', name: 'Saudi Arabia', detail: '+966' },
  ];
  const codes = (query: string) => searchCountries(rows, query).map((row) => row.code);

  it('keeps every row for an empty search', () => {
    expect(codes('  ')).toEqual(['JO', 'US', 'AE', 'AX', 'SA']);
  });

  it('finds by name, the names that start with the words first, without minding case or accents', () => {
    expect(codes('united')).toEqual(['US', 'AE']);
    expect(codes('ARAB')).toEqual(['AE', 'SA']);
    expect(codes('aland')).toEqual(['AX']);
    expect(codes('zz')).toEqual([]);
  });

  it('finds by the two-letter code', () => {
    expect(codes('jo')).toEqual(['JO']);
  });

  it('finds by calling code, with or without the +', () => {
    expect(codes('+96')).toEqual(['JO', 'SA']);
    expect(codes('962')).toEqual(['JO']);
    expect(codes('358 1')).toEqual(['AX']);
  });

  it('puts the countries whose code is exactly the search first, the main country of the code at the top', () => {
    const all = dialCountryRows();
    const first = (query: string, count: number) =>
      searchCountries(all, query)
        .slice(0, count)
        .map((row) => row.code);
    // Alphabetically Guernsey (+44 1481) comes before the United Kingdom: Enter on "+44" must still choose the United Kingdom.
    expect(first('+44', 2)).toEqual(['GB', 'IM']);
    expect(searchCountries(all, '+44').map((row) => row.code)).toEqual(['GB', 'IM', 'GG', 'JE']);
    expect(first('1', 2)).toEqual(['US', 'CA']);
    expect(first('+7', 2)).toEqual(['RU', 'KZ']);
    expect(first('+962', 1)).toEqual(['JO']);
  });

  it('finds by name in a list that has no calling codes', () => {
    expect(searchCountries([{ code: 'JO', name: 'Jordan' }], 'jor')).toHaveLength(1);
    expect(searchCountries([{ code: 'JO', name: 'Jordan' }], '962')).toHaveLength(0);
  });
});

describe('typedPhone', () => {
  it('lets a whole number replace a lone calling code the list wrote (a paste after choosing a country)', () => {
    expect(typedPhone('+962 ', '+962 +962 79 123 4567')).toBe('+962 79 123 4567');
    expect(typedPhone('+962 ', '+962 0044 20 7946 0000')).toBe('0044 20 7946 0000');
    expect(typedPhone('+1 242 ', '+1 242 +1 242 555 0100')).toBe('+1 242 555 0100');
  });

  it('keeps ordinary typing as it is', () => {
    expect(typedPhone('+962 ', '+962 7')).toBe('+962 7');
    expect(typedPhone('', '+962')).toBe('+962');
    expect(typedPhone('+962 79', '+962 79 +1')).toBe('+962 79 +1');
    expect(typedPhone('+962 ', '+96')).toBe('+96');
  });
});
