// Tests for the Add dialog's checks and the body it sends.
import { describe, expect, it } from 'vitest';
import { blockReasonHint, blockValueHint, imeiDigits, isImei, toCreateBody } from './blocklist';

describe('value', () => {
  it('asks for a value', () => {
    expect(blockValueHint('email', '  ')).toBe('Enter what to block.');
    expect(blockValueHint('email', 'a@b.example')).toBeNull();
  });

  it('wants 15 digits for an IMEI, with or without spaces', () => {
    expect(isImei('35 389011 884201 4')).toBe(true);
    expect(isImei('3538901188420')).toBe(false);
    expect(blockValueHint('imei', '12345')).toBe('An IMEI has 15 digits.');
    expect(blockValueHint('imei', '353890118842014')).toBeNull();
    expect(imeiDigits('35 389011 884201 4')).toBe('353890118842014');
  });
});

describe('reason', () => {
  it('asks for a short reason', () => {
    expect(blockReasonHint(' ')).toBe('Add a short reason so the next person knows why.');
    expect(blockReasonHint('Card testing')).toBeNull();
  });
});

describe('body', () => {
  it('trims the text and sends an IMEI as its digits', () => {
    expect(toCreateBody({ kind: 'imei', value: ' 35 389011 884201 4 ', reason: ' stolen ' })).toEqual({
      kind: 'imei',
      value: '353890118842014',
      reason: 'stolen',
    });
    expect(toCreateBody({ kind: 'domain', value: ' tempbox.example ', reason: 'x' }).value).toBe(
      'tempbox.example',
    );
  });
});
