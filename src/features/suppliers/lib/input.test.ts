// Tests for what the connection forms accept and send: cleaning, the money text, the create body and the fields of an edit.
import { describe, expect, it } from 'vitest';
import type { Supplier } from '../types';
import {
  changedFields,
  cleanBaseUrl,
  cleanName,
  hasCustomLimits,
  isPositiveInt,
  moneyText,
  toCreateBody,
  validBaseUrl,
  valuesOf,
  type SupplierFormValues,
} from './input';

const nordic = {
  id: 1,
  name: 'Nordic GSM',
  driver: 'dhru',
  baseUrl: 'https://api.nordicgsm.example',
  username: 'gsm-supply',
  currency: 'USD',
  lowBalanceAlert: '150.0000',
  maxConcurrency: 5,
  rateLimitPerMin: 60,
  timeoutMs: 15000,
} as Supplier;

describe('cleaning and shape checks', () => {
  it('tidies names and addresses', () => {
    expect(cleanName('  Atlas   IMEI ')).toBe('Atlas IMEI');
    expect(cleanBaseUrl(' https://api.example.com/// ')).toBe('https://api.example.com');
  });

  it('accepts an http(s) address with a host and refuses anything else', () => {
    expect(validBaseUrl('https://api.example.com')).toBe(true);
    expect(validBaseUrl('http://api.example.com:8080/v2/index.php')).toBe(true);
    expect(validBaseUrl('api.example.com')).toBe(false);
    expect(validBaseUrl('ftp://api.example.com')).toBe(false);
    // Local and IP addresses are allowed: the server decides what it can reach.
    expect(validBaseUrl('https://localhost')).toBe(true);
    expect(validBaseUrl('http://10.0.0.5:8080')).toBe(true);
  });

  it('accepts a whole number of one or more', () => {
    expect(['5', ' 60 ', '15000'].every(isPositiveInt)).toBe(true);
    expect(['0', '-1', '1.5', 'x', ''].some(isPositiveInt)).toBe(false);
  });
});

describe('moneyText', () => {
  it('pads to four decimals without any arithmetic', () => {
    expect(moneyText('150')).toBe('150.0000');
    expect(moneyText('150.5')).toBe('150.5000');
    expect(moneyText(' 0.25 ')).toBe('0.2500');
    expect(moneyText('150.1234')).toBe('150.1234');
  });

  it('refuses text that is not an amount', () => {
    for (const text of ['', 'abc', '-5', '1.23456', '1,5', '.5']) expect(moneyText(text)).toBeNull();
  });
});

const values = (overrides: Partial<SupplierFormValues> = {}): SupplierFormValues => ({
  ...valuesOf(nordic),
  ...overrides,
});

describe('toCreateBody', () => {
  it('cleans the fields and leaves out limits that were not filled', () => {
    expect(
      toCreateBody(
        values({
          name: ' Atlas  IMEI ',
          apiKey: ' sk_x ',
          baseUrl: 'https://api.atlas.example/',
          lowBalanceAlert: '',
          maxConcurrency: '',
          rateLimitPerMin: '30',
          timeoutMs: '',
        }),
      ),
    ).toEqual({
      name: 'Atlas IMEI',
      driver: 'dhru',
      baseUrl: 'https://api.atlas.example',
      username: 'gsm-supply',
      apiKey: 'sk_x',
      currency: 'USD',
      rateLimitPerMin: 30,
    });
  });

  it('sends exactly what the form sent before for a form left at its defaults: the Dhru driver, USD and no limits', () => {
    expect(
      toCreateBody({
        name: 'Atlas IMEI',
        baseUrl: 'https://api.atlas.example',
        username: 'gsm-supply',
        apiKey: 'sk_x',
        lowBalanceAlert: '',
        maxConcurrency: '',
        rateLimitPerMin: '',
        timeoutMs: '',
      }),
    ).toEqual({
      name: 'Atlas IMEI',
      driver: 'dhru',
      baseUrl: 'https://api.atlas.example',
      username: 'gsm-supply',
      apiKey: 'sk_x',
      currency: 'USD',
    });
  });

  it('has no API type or currency in the form values, so none can be typed', () => {
    expect(Object.keys(valuesOf(nordic))).toEqual([
      'name',
      'baseUrl',
      'username',
      'apiKey',
      'lowBalanceAlert',
      'maxConcurrency',
      'rateLimitPerMin',
      'timeoutMs',
    ]);
  });
});

describe('hasCustomLimits', () => {
  it('is false for the defaults, which keeps the fold of "Edit connection" closed', () => {
    expect(hasCustomLimits(nordic)).toBe(false);
    expect(hasCustomLimits({ ...nordic, lowBalanceAlert: '150' })).toBe(false);
  });

  it.each([
    ['the alert', { lowBalanceAlert: '200.0000' }],
    ['the calls at a time', { maxConcurrency: 8 }],
    ['the calls per minute', { rateLimitPerMin: 30 }],
    ['the timeout', { timeoutMs: 20000 }],
  ])('is true when %s is not the default, which opens the fold', (_name, change) => {
    expect(hasCustomLimits({ ...nordic, ...change })).toBe(true);
  });
});

describe('changedFields', () => {
  it('never sends the API type or the currency, even for a supplier that holds others', () => {
    const rest = { ...nordic, driver: 'rest', currency: 'EUR' } as Supplier;
    expect(changedFields(rest, values({ ...valuesOf(rest), name: 'Renamed' }))).toEqual({ name: 'Renamed' });
  });

  it('is empty when nothing changed, even if the alert is typed another way', () => {
    expect(changedFields(nordic, values())).toEqual({});
    expect(changedFields(nordic, values({ lowBalanceAlert: '150' }))).toEqual({});
  });

  it('lists only what changed, and an empty key keeps the stored one', () => {
    expect(changedFields(nordic, values({ baseUrl: 'https://api.new.example', timeoutMs: '20000' }))).toEqual(
      {
        baseUrl: 'https://api.new.example',
        timeoutMs: 20000,
      },
    );
    expect(changedFields(nordic, values({ apiKey: 'zz_new' }))).toEqual({ apiKey: 'zz_new' });
    expect(changedFields(nordic, values({ lowBalanceAlert: '200' }))).toEqual({
      lowBalanceAlert: '200.0000',
    });
  });
});
