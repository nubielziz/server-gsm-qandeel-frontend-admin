// Tests for the accrual display helpers: the CA number, the status badge, and the per-agent totals the approval dialog lists.
import { describe, expect, it } from 'vitest';
import type { CommissionAccrual } from '../types';
import { accrualLabel, agentName, agentTotals, commissionsText, statusBadge, totalOf } from './accrual';

const accrual = (id: number, beneficiaryId: number, amount: string): CommissionAccrual => ({
  id,
  planId: 1,
  beneficiaryId,
  orderId: id,
  period: '2026-03',
  basisAmount: '10.0000',
  percent: '3.0000',
  amount,
  status: 'accrued',
  ledgerTxId: null,
  createdAt: '2026-03-01T00:00:00.000Z',
  beneficiary: beneficiaryId === 1 ? { id: 1, name: 'Zain' } : null,
});

describe('accrualLabel and commissionsText', () => {
  it('pads the number as the demo did and counts in the singular', () => {
    expect(accrualLabel(7)).toBe('CA-0007');
    expect(accrualLabel(12345)).toBe('CA-12345');
    expect(commissionsText(1)).toBe('1 commission');
    expect(commissionsText(3)).toBe('3 commissions');
  });
});

describe('statusBadge', () => {
  it('is the demo’s Accrued and Approved, and any other status as it is', () => {
    expect(statusBadge('accrued')).toEqual({ tone: 'warn', icon: 'clock', label: 'Accrued' });
    expect(statusBadge('approved')).toEqual({ tone: 'good', icon: 'checkCircle', label: 'Approved' });
    expect(statusBadge('reversed')).toMatchObject({ tone: 'neutral', label: 'reversed' });
  });
});

describe('agent totals', () => {
  const rows = [
    accrual(1, 1, '0.4900'),
    accrual(2, 2, '1.0500'),
    accrual(3, 1, '0.1700'),
    accrual(4, 2, '0.3500'),
  ];

  it('groups the accruals by agent, the biggest amount first', () => {
    expect(agentTotals(rows)).toEqual([
      { id: 2, name: 'Merchant 2', count: 2, amount: 1.4 },
      { id: 1, name: 'Zain', count: 2, amount: 0.66 },
    ]);
  });

  it('adds all of them for display, without float noise', () => {
    expect(totalOf(rows)).toBe(2.06);
    expect(totalOf([])).toBe(0);
  });

  it('names an agent whose join is missing by its merchant id', () => {
    expect(agentName(accrual(1, 9, '1'))).toBe('Merchant 9');
  });
});
