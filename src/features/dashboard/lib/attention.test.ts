// Tests for the "Needs attention" words and buttons: one case for every kind the server can send, the plural forms, the
// button's address, and an unknown kind from a newer server.
import { describe, expect, it } from 'vitest';
import { ATTENTION_SAMPLES } from '../test/fixtures';
import type { AttentionItem } from '../types';
import { describeAttention, UNKNOWN_ATTENTION } from './attention';

const NOW = Date.parse('2026-10-30T10:00:00.000Z');
const NBSP = '\u00a0';

const sample = (kind: AttentionItem['kind']): AttentionItem => {
  const found = ATTENTION_SAMPLES.find((item) => item.kind === kind);
  if (!found) throw new Error(`No sample for ${kind}`);
  return found;
};
const view = (item: AttentionItem, scope: 'all' | 'b2b' | 'b2c' = 'all') =>
  describeAttention(item, { now: NOW, scope });

describe('describeAttention', () => {
  it('has a sample for every kind of the contract', () => {
    const kinds = new Set(ATTENTION_SAMPLES.map((item) => item.kind));
    expect([...kinds].sort()).toEqual(
      [
        'commissions_accrued',
        'deposits_pending',
        'disputes_due',
        'fx_stale',
        'merchants_pending',
        'orders_held',
        'orders_past_sla',
        'orders_review',
        'refunds_failed',
        'refunds_requested',
        'services_below_floor',
        'supplier_balance_low',
        'supplier_down',
        'tickets_late',
        'wallets_negative',
      ].sort(),
    );
  });

  it('orders past SLA: the oldest order and how late it is, linking to the past-SLA list of the channel shown', () => {
    expect(view(sample('orders_past_sla'))).toEqual({
      title: '3 orders are past SLA',
      meta: 'Oldest #48784, 12m over its 2m target',
      action: { label: 'Open orders', page: 'orders', to: '/orders?pastSla=true' },
    });
    expect(view(sample('orders_past_sla'), 'b2c').action?.to).toBe('/orders?channel=b2c&pastSla=true');
    expect(view(sample('orders_past_sla'), 'b2b').action?.to).toBe('/orders?channel=b2b&pastSla=true');
    const single = { ...sample('orders_past_sla'), count: 1 } as AttentionItem;
    expect(view(single).title).toBe('1 order is past SLA');
  });

  it('orders to review: the most common reason in the middle of a sentence, and the review tab', () => {
    expect(view(sample('orders_review'))).toEqual({
      title: '5 orders need manual review',
      meta: 'Most common: supplier timed out after 3 attempts (3)',
      action: { label: 'Review queue', page: 'orders', to: '/orders?tab=review' },
    });
    const returned = {
      ...sample('orders_review'),
      topReason: 'Supplier returned an empty reply',
    } as AttentionItem;
    expect(view(returned).meta).toBe('Most common: supplier returned an empty reply (3)');
    const none = { ...sample('orders_review'), topReason: null, count: 1 } as AttentionItem;
    expect(view(none)).toMatchObject({ title: '1 order needs manual review', meta: '' });
  });

  it('a supplier that is down or degraded: its success in the last hour and the orders that depend on it', () => {
    expect(view(sample('supplier_down'))).toEqual({
      title: 'Gulf Server Hub is down',
      meta: '42% success in the last hour, 7 open orders depend on it',
      action: { label: 'Open supplier', page: 'suppliers', to: '/suppliers?supplier=2' },
    });
    const degraded = {
      id: 'sup-3',
      severity: 'high',
      kind: 'supplier_degraded',
      supplierId: 3,
      supplierName: 'Rapid IMEI',
      successRate: null,
      openOrders: 1,
    } as const;
    expect(view(degraded)).toMatchObject({
      title: 'Rapid IMEI is degraded',
      meta: '1 open order depends on it',
    });
  });

  it('a low supplier balance: the balance, the runway, and "Open supplier" instead of the demo\'s top-up button', () => {
    expect(view(sample('supplier_balance_low'))).toEqual({
      title: 'Gulf Server Hub prepaid balance is $38.40',
      meta: 'About less than a day of volume left at the 7-day rate',
      action: { label: 'Open supplier', page: 'suppliers', to: '/suppliers?supplier=2' },
    });
    const days = { ...sample('supplier_balance_low'), runwayDays: 3.2 } as AttentionItem;
    expect(view(days).meta).toBe('About 3.2 days of volume left at the 7-day rate');
    const unused = { ...sample('supplier_balance_low'), runwayDays: null } as AttentionItem;
    expect(view(unused).meta).toBe('Below the $150 minimum');
  });

  it('services below the floor: the first two names', () => {
    expect(view(sample('services_below_floor'))).toEqual({
      title: '1 service is priced below cost plus minimum profit',
      meta: 'Chimera Tool 1 Month (supplier cost changed). Orders are charged the floor price until you update it',
      action: { label: 'Fix pricing', page: 'services', to: '/services?belowFloor=true' },
    });
    const many = {
      ...sample('services_below_floor'),
      count: 3,
      serviceNames: ['A', 'B', 'C'],
    } as AttentionItem;
    expect(view(many).title).toBe('3 services are priced below cost plus minimum profit');
    expect(view(many).meta.startsWith('A, B (supplier cost changed).')).toBe(true);
  });

  it('pending deposits: the total and how long the oldest has waited', () => {
    expect(view(sample('deposits_pending'))).toEqual({
      title: '2 deposits are waiting for review',
      meta: '$720 total, oldest 3h ago',
      action: { label: 'Review deposits', page: 'finance', to: '/finance?tab=payments' },
    });
  });

  it('negative wallets: each merchant with its balance, linking to the first one', () => {
    expect(view(sample('wallets_negative'))).toEqual({
      title: '1 merchant has a negative wallet',
      meta: 'Muscat Mobile Clinic -$81.95',
      action: { label: 'Open merchant', page: 'merchants', to: '/merchants/17' },
    });
    const two = {
      ...sample('wallets_negative'),
      count: 2,
      clients: [
        { id: 17, name: 'A', balance: '-1.0000' },
        { id: 3, name: 'B', balance: '-2.5000' },
      ],
    } as AttentionItem;
    expect(view(two)).toMatchObject({
      title: '2 merchants have a negative wallet',
      meta: 'A -$1.00, B -$2.50',
    });
  });

  it('merchants waiting for approval: their names, on the pending tab', () => {
    expect(view(sample('merchants_pending'))).toEqual({
      title: '2 merchant accounts waiting for approval',
      meta: 'Aqaba Gadgets, Doha Unlock',
      action: { label: 'Review', page: 'merchants', to: '/merchants?tab=pending' },
    });
    expect(view({ ...sample('merchants_pending'), count: 1, names: ['Solo'] } as AttentionItem).title).toBe(
      '1 merchant account waiting for approval',
    );
  });

  it('commission accruals: the total and the agents, singular and plural', () => {
    expect(view(sample('commissions_accrued'))).toEqual({
      title: '4 commission accruals ready to approve',
      meta: '$12.34 across 2 agents',
      action: { label: 'Review', page: 'commissions', to: '/commissions' },
    });
    const one = { ...sample('commissions_accrued'), count: 1, agents: 1 } as AttentionItem;
    expect(view(one)).toMatchObject({
      title: '1 commission accrual ready to approve',
      meta: '$12.34 across 1 agent',
    });
  });

  it('held storefront orders: what was captured and how long the oldest has waited', () => {
    expect(view(sample('orders_held'))).toEqual({
      title: '4 paid orders are held by the risk engine',
      meta: '$83 captured. Nothing goes to a supplier until a person decides. Oldest 5d ago',
      action: { label: 'Review queue', page: 'risk', to: '/risk' },
    });
  });

  it('card disputes: the first dispute, its deadline and what is at stake', () => {
    expect(view(sample('disputes_due'))).toEqual({
      title: '2 card disputes need evidence',
      meta: `DP-2005 is due in 2d${NBSP}3h. Missing the date loses the dispute and $15.59 plus a $15 fee`,
      action: { label: 'Open disputes', page: 'refunds', to: '/refunds?tab=disputes' },
    });
    const late = { ...sample('disputes_due'), dueAt: '2026-10-30T06:00:00.000Z', count: 1 } as AttentionItem;
    expect(view(late)).toMatchObject({ title: '1 card dispute needs evidence' });
    expect(view(late).meta.startsWith('DP-2005 was due 4h ago.')).toBe(true);
  });

  it('late tickets: the oldest ticket, how long it waited and its subject', () => {
    expect(view(sample('tickets_late'))).toEqual({
      title: '2 tickets are waiting past the reply target',
      meta: 'Oldest T-4202, 5h without a reply. Phone still locked after unlock',
      action: { label: 'Open inbox', page: 'support', to: '/support?filter=late' },
    });
  });

  it('refund requests and failures: the total, the reason, and the refunds list by status', () => {
    expect(view(sample('refunds_requested'))).toEqual({
      title: '1 refund request needs a decision',
      meta: '$19.99 if all are approved',
      action: { label: 'Review', page: 'refunds', to: '/refunds?tab=refunds&status=requested' },
    });
    expect(view(sample('refunds_failed'))).toEqual({
      title: '2 refunds failed at the gateway',
      meta: 'RF-1011: Gateway timeout',
      action: { label: 'Retry', page: 'refunds', to: '/refunds?tab=refunds&status=failed' },
    });
  });

  it('stale exchange rates: the currencies and how long since the oldest update', () => {
    expect(view(sample('fx_stale'))).toEqual({
      title: 'Exchange rate for SEK, CAD is out of date',
      meta: 'Last updated 1d ago. Customers are being quoted a stale price in that currency',
      action: { label: 'Refresh rates', page: 'settings', to: '/settings?tab=tax' },
    });
  });

  it('shows a kind it does not know with a neutral title and no button', () => {
    const future = { id: 'new-1', severity: 'high', kind: 'warehouse_on_fire' } as unknown as AttentionItem;
    expect(view(future)).toEqual(UNKNOWN_ATTENTION);
    expect(UNKNOWN_ATTENTION).toEqual({ title: 'Needs attention', meta: '', action: null });
  });
});
