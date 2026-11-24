// Tests for reading a price typed into the fixed-price dialog: the money text the API takes, how it is written back into the box, and how two
// amounts are compared without a float.
import { describe, expect, it } from 'vitest';
import { cleanNote, parsePrice, priceInput, samePrice } from './priceInput';

describe('parsePrice', () => {
  it('writes a price as the four-decimal money text the API takes', () => {
    expect(parsePrice('15')).toBe('15.0000');
    expect(parsePrice('0.05')).toBe('0.0500');
    expect(parsePrice('  12.3456 ')).toBe('12.3456');
    expect(parsePrice('$1,250.5')).toBe('1250.5000');
    expect(parsePrice('007')).toBe('7.0000');
  });

  it('refuses zero, nonsense, a fifth decimal and a comma used as the decimal mark', () => {
    expect(parsePrice('0')).toBeNull();
    expect(parsePrice('0.0000')).toBeNull();
    expect(parsePrice('')).toBeNull();
    expect(parsePrice('cheap')).toBeNull();
    expect(parsePrice('-3')).toBeNull();
    expect(parsePrice('1.23456')).toBeNull();
    expect(parsePrice('25,50')).toBeNull();
  });
});

describe('priceInput', () => {
  it('writes money text back as a person would type it', () => {
    expect(priceInput('0.1000')).toBe('0.10');
    expect(priceInput('0.1250')).toBe('0.125');
    expect(priceInput('15.0000')).toBe('15.00');
    expect(priceInput('7')).toBe('7.00');
  });
});

describe('samePrice', () => {
  it('compares amounts by their digits, not by how many zeros they carry', () => {
    expect(samePrice('0.1', '0.1000')).toBe(true);
    expect(samePrice('15.0000', '15')).toBe(true);
    expect(samePrice('0.10', '0.1001')).toBe(false);
    expect(samePrice('15.0000', '51.0000')).toBe(false);
  });
});

describe('cleanNote', () => {
  it('trims the note', () => {
    expect(cleanNote('  Volume deal ')).toBe('Volume deal');
  });
});
