// Tests for the pure helpers of the Suppliers card: the problems-first order, the quiet line, the balance as money with the
// words of its state, and the words of the Pause and Resume dialog.
import { describe, expect, it } from 'vitest';
import { measure, supplier } from './ordersFixture';
import {
  balanceStateText,
  balanceText,
  groupSuppliers,
  quietText,
  statusChangeFor,
  statusDialogWords,
  supplierRank,
  suppliersSummary,
} from './suppliersModel';

describe('supplierRank', () => {
  it('ranks a supplier whose every state is ok as healthy (4)', () => {
    expect(supplierRank(supplier())).toBe(4);
  });

  it('takes the worst state the server judged: checks, latency, rates, balance or circuit', () => {
    expect(supplierRank(supplier({ health: 'down' }))).toBe(0);
    expect(supplierRank(supplier({ health: 'degraded' }))).toBe(1);
    expect(supplierRank(supplier({ latency: measure(2500, 'ms', 'warn') }))).toBe(1);
    expect(supplierRank(supplier({ errorRate: measure(30, 'percent', 'crit') }))).toBe(0);
    expect(supplierRank(supplier({ timeoutRate: measure(9, 'percent', 'warn') }))).toBe(1);
    expect(
      supplierRank(
        supplier({ balance: { amount: '38.4000', currency: 'USD', state: 'warn', checkedAt: null } }),
      ),
    ).toBe(1);
    expect(supplierRank(supplier({ circuit: 'open' }))).toBe(0);
    expect(supplierRank(supplier({ circuit: 'half_open' }))).toBe(1);
  });

  it('never counts missing data as healthy', () => {
    expect(supplierRank(supplier({ health: 'unknown' }))).toBe(2);
    expect(supplierRank(supplier({ latency: measure(null, 'ms', 'unknown') }))).toBe(2);
  });

  it('keeps a paused supplier in view (3) whatever its checks say, and puts a disabled one last (5)', () => {
    expect(supplierRank(supplier({ status: 'paused', health: 'down' }))).toBe(3);
    expect(supplierRank(supplier({ status: 'disabled', health: 'unknown' }))).toBe(5);
  });

  it('treats a circuit value it does not know as no data', () => {
    // @ts-expect-error The contract is assumed, so the server may send a word the console does not know.
    expect(supplierRank(supplier({ circuit: 'tripped' }))).toBe(2);
  });
});

describe('groupSuppliers', () => {
  const nordic = supplier({ id: 1, name: 'Nordic GSM' });
  const gulf = supplier({
    id: 2,
    name: 'Gulf Server Hub',
    balance: { amount: '38.4000', currency: 'USD', state: 'warn', checkedAt: null },
  });
  const rapid = supplier({ id: 3, name: 'Rapid IMEI', health: 'down', circuit: 'open' });
  const remote = supplier({ id: 4, name: 'RemoteDesk Pro', status: 'paused' });
  const old = supplier({ id: 5, name: 'Old Hub', status: 'disabled', health: 'unknown' });
  const file = supplier({ id: 6, name: 'FileForge' });

  it('puts problems first, then paused, then healthy ones, then disabled ones, each group in the server order', () => {
    const groups = groupSuppliers([nordic, old, remote, gulf, file, rapid]);
    expect(groups.all.map((entry) => entry.name)).toEqual([
      'Rapid IMEI',
      'Gulf Server Hub',
      'RemoteDesk Pro',
      'Nordic GSM',
      'FileForge',
      'Old Hub',
    ]);
  });

  it('splits what needs a look from what is quiet, and counts healthy and disabled suppliers', () => {
    const groups = groupSuppliers([nordic, old, remote, gulf, file, rapid]);
    expect(groups.attention.map((entry) => entry.name)).toEqual([
      'Rapid IMEI',
      'Gulf Server Hub',
      'RemoteDesk Pro',
    ]);
    expect(groups.quiet.map((entry) => entry.name)).toEqual(['Nordic GSM', 'FileForge', 'Old Hub']);
    expect(groups.healthy).toBe(2);
    expect(groups.disabled).toBe(1);
  });

  it('does not change the list it was given', () => {
    const list = [nordic, rapid];
    groupSuppliers(list);
    expect(list.map((entry) => entry.id)).toEqual([1, 3]);
  });
});

describe('quietText and suppliersSummary', () => {
  it('names the healthy and disabled counts, with a singular noun for one', () => {
    const one = groupSuppliers([supplier({ id: 1, health: 'down' }), supplier({ id: 2 })]);
    expect(quietText(one)).toBe('1 supplier healthy');
    const many = groupSuppliers([
      supplier({ id: 1, health: 'down' }),
      supplier({ id: 2 }),
      supplier({ id: 3 }),
      supplier({ id: 4, status: 'disabled', health: 'unknown' }),
    ]);
    expect(quietText(many)).toBe('2 suppliers healthy · 1 disabled');
  });

  it('says first that nothing needs attention when no row does', () => {
    const calm = groupSuppliers([supplier({ id: 1 }), supplier({ id: 2 })]);
    expect(quietText(calm)).toBe('No supplier needs attention · 2 suppliers healthy');
    const disabledOnly = groupSuppliers([supplier({ status: 'disabled', health: 'unknown' })]);
    expect(quietText(disabledOnly)).toBe('No supplier needs attention · 1 disabled');
  });

  it('summarises how many suppliers there are and how many need a look', () => {
    expect(suppliersSummary(groupSuppliers([supplier({ id: 1 }), supplier({ id: 2 })]))).toBe(
      '2 suppliers · none need attention',
    );
    expect(suppliersSummary(groupSuppliers([supplier({ id: 1, health: 'down' }), supplier({ id: 2 })]))).toBe(
      '2 suppliers · 1 needs attention',
    );
    expect(
      suppliersSummary(
        groupSuppliers([supplier({ id: 1, health: 'down' }), supplier({ id: 2, health: 'degraded' })]),
      ),
    ).toBe('2 suppliers · 2 need attention');
    expect(suppliersSummary(groupSuppliers([supplier({ id: 1 })]))).toBe('1 supplier · none need attention');
  });
});

describe('balanceText', () => {
  it('prints US dollars with the dollar sign and thousands separators', () => {
    expect(balanceText({ amount: '1850.0000', currency: 'USD' })).toBe('$1,850.00');
    expect(balanceText({ amount: '38.4000', currency: 'USD' })).toBe('$38.40');
  });

  it('puts the currency code in front of any other currency, so the unit is always there', () => {
    expect(balanceText({ amount: '1850.0000', currency: 'EUR' })).toBe('EUR 1,850.00');
    expect(balanceText({ amount: '-12.5000', currency: 'EUR' })).toBe('-EUR 12.50');
    expect(balanceText({ amount: '-12.5000', currency: 'USD' })).toBe('-$12.50');
  });

  it('reads a missing currency as US dollars and an unreadable amount as no data', () => {
    expect(balanceText({ amount: '5.0000', currency: '' })).toBe('$5.00');
    expect(balanceText({ amount: 'n/a', currency: 'USD' })).toBe('No data');
    expect(balanceText({ amount: '', currency: 'USD' })).toBe('No data');
    expect(balanceText({ amount: null as unknown as string, currency: 'USD' })).toBe('No data');
  });
});

describe('balanceStateText', () => {
  it('says nothing for an ok balance, so a fine supplier stays quiet', () => {
    expect(balanceStateText('ok')).toBeNull();
  });

  it('names the server state in plain words: low for warn, very low for critical', () => {
    expect(balanceStateText('warn')).toBe('Low balance');
    expect(balanceStateText('crit')).toBe('Very low balance');
  });

  it('never reads a state it cannot judge, or does not know, as fine', () => {
    expect(balanceStateText('unknown')).toBe('Balance unknown');
    // @ts-expect-error The contract is assumed, so the server may send a state the console does not know.
    expect(balanceStateText('frozen')).toBe('Balance unknown');
  });
});

describe('statusChangeFor', () => {
  it('pauses an active supplier and resumes a paused one, carrying its id and name', () => {
    expect(statusChangeFor(supplier({ id: 3, name: 'Rapid IMEI', status: 'active' }))).toEqual({
      id: 3,
      name: 'Rapid IMEI',
      status: 'paused',
    });
    expect(statusChangeFor(supplier({ id: 3, name: 'Rapid IMEI', status: 'paused' }))).toEqual({
      id: 3,
      name: 'Rapid IMEI',
      status: 'active',
    });
  });

  it('offers nothing for a disabled supplier: enabling it is the Suppliers page job', () => {
    expect(statusChangeFor(supplier({ status: 'disabled' }))).toBeNull();
  });
});

describe('statusDialogWords', () => {
  it('states the effect of a pause before the confirm button', () => {
    expect(statusDialogWords({ id: 3, name: 'Rapid IMEI', status: 'paused' })).toEqual({
      title: 'Pause Rapid IMEI?',
      effect: 'New orders go to the next supplier by priority; orders already sent stay as they are.',
      confirm: 'Pause supplier',
    });
  });

  it('states the effect of a resume with the supplier name', () => {
    expect(statusDialogWords({ id: 3, name: 'Rapid IMEI', status: 'active' })).toEqual({
      title: 'Resume Rapid IMEI?',
      effect: 'Rapid IMEI takes new orders again in its priority order.',
      confirm: 'Resume supplier',
    });
  });
});
