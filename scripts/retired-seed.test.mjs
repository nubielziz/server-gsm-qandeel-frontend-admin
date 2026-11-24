// Tests for the retired-data step of the demo seed: the merchants' verification word (decision 020), the status of the merchants
// that waited for approval, the commissions (plans, accruals, plan, agent flag and referrer of a merchant), the customer rating of a
// ticket, the reminder of an abandoned checkout and the landing pages and TAC catalogue of Shop content (decision 025) are taken out of
// the captured state, and the committed file has none of them, so `seed:extract` and the mock layer agree.
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  dropCheckoutReminders,
  dropCommissions,
  dropLandingAndTac,
  dropMerchantApproval,
  dropMerchantVerification,
  dropTicketRatings,
  LEGACY_PENDING_MERCHANT,
} from './retired-seed.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

describe('dropMerchantVerification', () => {
  it('removes the word from every merchant and touches nothing else', () => {
    const state = {
      merchants: [
        { id: 'm1', name: 'Zain', status: 'active', kyc: 'Verified' },
        { id: 'm2', name: 'Algiers', status: 'pending', kyc: 'In review' },
      ],
      customers: [{ id: 'c1', name: 'Pat' }],
    };
    expect(dropMerchantVerification(state)).toEqual({
      merchants: [
        { id: 'm1', name: 'Zain', status: 'active' },
        { id: 'm2', name: 'Algiers', status: 'pending' },
      ],
      customers: [{ id: 'c1', name: 'Pat' }],
    });
  });

  it('accepts a state without merchants', () => {
    expect(dropMerchantVerification({ seq: { order: 1 } })).toEqual({ seq: { order: 1 } });
  });
});

describe('dropMerchantApproval', () => {
  it('makes a pending merchant active, keeps the legacy row pending and touches nothing else', () => {
    const state = {
      merchants: [
        { id: 'm1', name: 'Zain', status: 'active' },
        { id: 'm18', name: 'Algiers', status: 'pending' },
        { id: LEGACY_PENDING_MERCHANT, name: 'Accra', status: 'pending' },
        { id: 'm19', name: 'Tunis', status: 'suspended' },
      ],
      customers: [{ id: 'c1', name: 'Pat', status: 'pending' }],
    };
    expect(dropMerchantApproval(state)).toEqual({
      merchants: [
        { id: 'm1', name: 'Zain', status: 'active' },
        { id: 'm18', name: 'Algiers', status: 'active' },
        { id: LEGACY_PENDING_MERCHANT, name: 'Accra', status: 'pending' },
        { id: 'm19', name: 'Tunis', status: 'suspended' },
      ],
      customers: [{ id: 'c1', name: 'Pat', status: 'pending' }],
    });
  });

  it('accepts a state without merchants', () => {
    expect(dropMerchantApproval({ seq: { order: 1 } })).toEqual({ seq: { order: 1 } });
  });
});

describe('dropCommissions', () => {
  it('removes the plans, the accruals, the accrual counter and the commission fields of every merchant', () => {
    const state = {
      seq: { order: 1, ca: 161 },
      plans: [{ id: 'pl1' }],
      accruals: [{ id: 'CA-0001' }],
      merchants: [
        { id: 'm1', name: 'Zain', status: 'active', referredBy: null, plan: 'pl1', isAgent: true },
        { id: 'm8', name: 'Casablanca', status: 'active', referredBy: 'm1', plan: null, isAgent: false },
      ],
      journals: [{ id: 'JRN-00337', kind: 'commission', refType: 'accrual', refId: 'CA-0002' }],
    };
    expect(dropCommissions(state)).toEqual({
      seq: { order: 1 },
      merchants: [
        { id: 'm1', name: 'Zain', status: 'active' },
        { id: 'm8', name: 'Casablanca', status: 'active' },
      ],
      journals: [{ id: 'JRN-00337', kind: 'commission', refType: 'accrual', refId: 'CA-0002' }],
    });
  });

  it('accepts a state without merchants or a counter', () => {
    expect(dropCommissions({ orders: [] })).toEqual({ orders: [] });
  });
});

describe('dropTicketRatings', () => {
  it('removes the rating from every ticket and touches nothing else', () => {
    const state = {
      tickets: [
        { id: 'T-1', status: 'resolved', csat: 5, msgs: [{ by: 'customer' }] },
        { id: 'T-2', status: 'open', csat: null, msgs: [] },
      ],
      merchants: [{ id: 'm1', name: 'Zain' }],
    };
    expect(dropTicketRatings(state)).toEqual({
      tickets: [
        { id: 'T-1', status: 'resolved', msgs: [{ by: 'customer' }] },
        { id: 'T-2', status: 'open', msgs: [] },
      ],
      merchants: [{ id: 'm1', name: 'Zain' }],
    });
  });

  it('accepts a state without tickets', () => {
    expect(dropTicketRatings({ seq: { order: 1 } })).toEqual({ seq: { order: 1 } });
  });
});

describe('dropCheckoutReminders', () => {
  it('removes the reminder e-mail, its policy and the recovery word of every checkout, and keeps the checkouts', () => {
    const state = {
      settings: {
        notifs: [
          { id: 'nt4', event: 'Support reply' },
          { id: 'nt5', event: 'Abandoned checkout reminder' },
          { id: 'nt6', event: 'Payment failed' },
        ],
        policies: { guestCheckout: true, abandonedMinutes: 60, refundHoursBeforeDispatch: 1 },
      },
      checkouts: [{ id: 'CK-1', created: 1, recovery: 'sent' }],
    };
    expect(dropCheckoutReminders(state)).toEqual({
      settings: {
        notifs: [
          { id: 'nt4', event: 'Support reply' },
          { id: 'nt6', event: 'Payment failed' },
        ],
        policies: { guestCheckout: true, refundHoursBeforeDispatch: 1 },
      },
      checkouts: [{ id: 'CK-1', created: 1 }],
    });
  });

  it('accepts a state without settings or checkouts', () => {
    expect(dropCheckoutReminders({ seq: { order: 1 } })).toEqual({ seq: { order: 1 } });
  });
});

describe('dropLandingAndTac', () => {
  it('removes the landing and TAC tables and keeps the static pages and blog posts', () => {
    const state = {
      landing: [{ id: 'lp1', kind: 'carrier' }],
      tac: [{ tac: '35389011' }],
      pages: [{ id: 'pg1', kind: 'static' }],
      help: [{ id: 'h1' }],
    };
    expect(dropLandingAndTac(state)).toEqual({
      pages: [{ id: 'pg1', kind: 'static' }],
      help: [{ id: 'h1' }],
    });
  });

  it('accepts a state that has neither table', () => {
    expect(dropLandingAndTac({ pages: [] })).toEqual({ pages: [] });
  });
});

describe('the committed demo state', () => {
  const { state } = JSON.parse(readFileSync(resolve(root, 'src/mocks/seed/demo-state.json'), 'utf8'));

  it('has no verification word on any merchant', () => {
    expect(state.merchants.length).toBeGreaterThan(0);
    expect(state.merchants.some((row) => 'kyc' in row)).toBe(false);
  });

  it('has no pending merchant but the one legacy row', () => {
    const pending = state.merchants.filter((row) => row.status === 'pending').map((row) => row.id);
    expect(pending).toEqual([LEGACY_PENDING_MERCHANT]);
  });

  it('has no commission plans, accruals or counter, and no plan, agent flag or referrer on a merchant', () => {
    expect(state).not.toHaveProperty('plans');
    expect(state).not.toHaveProperty('accruals');
    expect(state.seq).not.toHaveProperty('ca');
    for (const field of ['plan', 'isAgent', 'referredBy']) {
      expect(state.merchants.some((row) => field in row)).toBe(false);
    }
  });

  it('keeps the old commission journals, which are history', () => {
    expect(state.journals.some((row) => row.kind === 'commission')).toBe(true);
  });

  it('has no rating on any ticket', () => {
    expect(state.tickets.length).toBeGreaterThan(0);
    expect(state.tickets.some((row) => 'csat' in row)).toBe(false);
  });

  it('has no landing pages and no TAC catalogue, and keeps the static pages and the blog posts', () => {
    expect(state).not.toHaveProperty('landing');
    expect(state).not.toHaveProperty('tac');
    expect(state.pages.map((row) => row.kind).sort()).toEqual([
      'blog',
      'blog',
      'blog',
      'static',
      'static',
      'static',
    ]);
  });

  it('has no checkout reminder, no reminder policy and no recovery word, and keeps the checkouts', () => {
    expect(state.settings.notifs.map((row) => row.id)).not.toContain('nt5');
    expect(state.settings.policies).not.toHaveProperty('abandonedMinutes');
    expect(state.checkouts.length).toBeGreaterThan(0);
    expect(state.checkouts.some((row) => 'recovery' in row)).toBe(false);
  });
});
