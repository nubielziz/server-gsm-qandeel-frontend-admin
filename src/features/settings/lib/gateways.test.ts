// Tests for the payment method texts and the "customers can pay" checks.
import { describe, expect, it } from 'vitest';
import type { PaymentGateway } from '../types';
import {
  customersCanPay,
  feeText,
  groupsText,
  isLastStorefrontMethod,
  limitsText,
  modeLabel,
  servesStorefront,
} from './gateways';

const gateway = (patch: Partial<PaymentGateway>): PaymentGateway => ({
  id: 1,
  code: 'card',
  driver: 'card',
  name: 'Card',
  audience: 'b2c',
  feePercent: '2.9000',
  feeFixed: '0.3000',
  minAmount: '0.0000',
  maxAmount: '0.0000',
  allowedGroupIds: [],
  supportsRefunds: true,
  supports3ds: true,
  isManual: false,
  instructions: '',
  holdHours: 0,
  isActive: true,
  createdAt: '2026-01-01T00:00:00.000Z',
  ...patch,
});

describe('feeText', () => {
  it('writes the percent and the fixed part, or Free', () => {
    expect(feeText(gateway({}))).toBe('2.9% + $0.30');
    expect(feeText(gateway({ feePercent: '1.0000', feeFixed: '0.0000' }))).toBe('1%');
    expect(feeText(gateway({ feePercent: '0.0000', feeFixed: '0.0000' }))).toBe('Free');
  });
});

describe('limitsText and groupsText', () => {
  it('treats a zero limit as none', () => {
    expect(limitsText(gateway({ minAmount: '1.0000', maxAmount: '2000.0000' }))).toBe('$1.00 to $2,000.00');
    expect(limitsText(gateway({ minAmount: '50.0000' }))).toBe('From $50.00');
    expect(limitsText(gateway({ maxAmount: '500.0000' }))).toBe('Up to $500.00');
    expect(limitsText(gateway({}))).toBe('No limits');
  });

  it('names the groups, or says all', () => {
    const groups = [{ id: 2, name: 'Wholesale' }];
    expect(groupsText([], groups)).toBe('All groups');
    expect(groupsText([2, 9], groups)).toBe('Wholesale, Group 9');
    expect(groupsText([2], undefined)).toBe('Group 2');
  });
});

describe('the storefront check', () => {
  const card = gateway({ id: 1 });
  const bank = gateway({ id: 2, audience: 'b2b' });
  const crypto = gateway({ id: 3, audience: 'both' });

  it('knows which methods serve the storefront', () => {
    expect(servesStorefront(card)).toBe(true);
    expect(servesStorefront(bank)).toBe(false);
    expect(servesStorefront(crypto)).toBe(true);
  });

  it('says customers cannot pay when no storefront method is on', () => {
    expect(customersCanPay([card, bank])).toBe(true);
    expect(customersCanPay([{ ...card, isActive: false }, bank])).toBe(false);
    expect(customersCanPay([])).toBe(false);
  });

  it('spots the last storefront method that is on', () => {
    expect(isLastStorefrontMethod(card, [card, bank])).toBe(true);
    expect(isLastStorefrontMethod(card, [card, crypto])).toBe(false);
    expect(isLastStorefrontMethod(bank, [card, bank])).toBe(false);
    expect(isLastStorefrontMethod({ ...card, isActive: false }, [{ ...card, isActive: false }])).toBe(false);
  });

  it('calls a manual gateway Manual', () => {
    expect(modeLabel(gateway({ isManual: true }))).toBe('Manual');
    expect(modeLabel(card)).toBe('Live');
  });
});
