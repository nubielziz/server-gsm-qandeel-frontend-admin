// Tests for the code the payment gateway mock makes when a new method comes without one (backend decision 077, `madeGatewayCode`): a ready-made
// method takes its preset's key, a custom one its name as an identifier (accents dropped, `method` for a name with nothing usable, 40 characters
// at most), and `_2`, `_3` follows when the code is taken. Characters outside ASCII are written as escapes.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { setupMockApi, signInAs } from '@/test/mockApi';
import { createGateway, listGateways } from '../api';
import type { CreateGatewayBody } from '../types';
import { madeCode } from './gatewayRoutes';

const none = () => false;

describe('madeCode', () => {
  it('makes the code from the name: lower case, runs of other characters become one underscore', () => {
    expect(madeCode('Bank of Jordan', null, none)).toBe('bank_of_jordan');
    expect(madeCode('  Vodafone -- Cash!!  ', null, none)).toBe('vodafone_cash');
    expect(madeCode('PayPal', undefined, none)).toBe('paypal');
  });

  it('drops accents and spells out the special Latin letters, as the server does', () => {
    expect(madeCode('D\u00e9lai Pay', null, none)).toBe('delai_pay');
    expect(madeCode('Cr\u00e9dit Agricole Caf\u00e9', null, none)).toBe('credit_agricole_cafe');
    expect(madeCode('Stra\u00dfe \u00f8', null, none)).toBe('strasse_o');
  });

  it('gives method for a name with nothing a-z or 0-9 in it, and keeps a name that starts with a digit', () => {
    expect(madeCode('\u0628\u0646\u0643', null, none)).toBe('method');
    expect(madeCode('!!!', null, none)).toBe('method');
    expect(madeCode('2Checkout', null, none)).toBe('2checkout');
    expect(madeCode('A', null, none)).toBe('a');
  });

  it('cuts the code to 40 characters', () => {
    expect(madeCode('x'.repeat(60), null, none)).toBe('x'.repeat(40));
    expect(madeCode(`${'a'.repeat(39)} bbbb`, null, none)).toBe('a'.repeat(39));
  });

  it('takes the key of a ready-made method, whatever the name says', () => {
    expect(madeCode('My bank', 'bank_transfer', none)).toBe('bank_transfer');
    expect(madeCode('', 'vodafone_cash', none)).toBe('vodafone_cash');
    // A key the catalog does not know is judged elsewhere (422 on preset); the code falls back to the name.
    expect(madeCode('Cash 2', 'nope', none)).toBe('cash_2');
  });

  it('adds the next number when the code is taken, cutting the base so the number fits', () => {
    const held = new Set(['bank_transfer', 'bank_transfer_2', 'bank', 'x'.repeat(40)]);
    const taken = (code: string) => held.has(code);
    expect(madeCode('Bank', null, taken)).toBe('bank_2');
    expect(madeCode('Whatever', 'bank_transfer', taken)).toBe('bank_transfer_3');
    expect(madeCode('x'.repeat(60), null, taken)).toBe(`${'x'.repeat(38)}_2`);
  });
});

describe('the create route', () => {
  setupMockApi();
  beforeEach(async () => {
    await signInAs();
  });
  afterEach(() => vi.restoreAllMocks());

  const body = (patch: Partial<CreateGatewayBody>): CreateGatewayBody => ({
    driver: 'bank',
    name: 'Bank',
    audience: 'b2c',
    feePercent: '0',
    feeFixed: '0',
    minAmount: '0',
    maxAmount: '0',
    allowedGroupIds: [],
    supportsRefunds: false,
    supports3ds: false,
    isManual: true,
    instructions: '',
    holdHours: 0,
    isActive: true,
    ...patch,
  });

  it('makes the codes of new methods the way the server does, with a number when the code is taken', async () => {
    const first = await createGateway(body({ name: 'D\u00e9lai Pay' }));
    const second = await createGateway(body({ name: 'Delai Pay' }));
    const arabic = await createGateway(body({ name: '\u0628\u0646\u0643' }));
    const long = await createGateway(body({ name: 'y'.repeat(60) }));
    expect([first.code, second.code, arabic.code, long.code]).toEqual([
      'delai_pay',
      'delai_pay_2',
      'method',
      'y'.repeat(40),
    ]);
    expect((await listGateways()).data.at(-1)?.code).toBe('y'.repeat(40));
  });

  it('gives a method made from a preset the key of the preset, and a number for a second one', async () => {
    const preset = { preset: 'bank_transfer', driver: 'bank_transfer', name: 'Bank transfer' };
    const first = await createGateway(body(preset));
    const second = await createGateway(body(preset));
    expect([first.code, second.code]).toEqual(['bank_transfer', 'bank_transfer_2']);
  });
});
