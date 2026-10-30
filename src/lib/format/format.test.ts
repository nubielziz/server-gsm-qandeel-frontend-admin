// The formatters must print exactly what the demo prints. The demo's own source is loaded as text and run here,
// so each helper is compared with the original function on the same inputs.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import b2cDataSource from '../../../reference/gsm-admin/src/js/09-b2c-data.js?raw';
import b2cUiSource from '../../../reference/gsm-admin/src/js/13-b2c-ui.js?raw';
import utilSource from '../../../reference/gsm-admin/src/js/00-util.js?raw';
import {
  ageText,
  ago,
  compact,
  dayKey,
  dur,
  fmtDate,
  fmtDay,
  fmtImei,
  fmtTime,
  lm,
  luhn,
  maskEmail,
  money,
  money0,
  num,
  pct,
  price,
  round,
  sum,
  toAmount,
} from '.';

type Demo = {
  money: (n: number, d?: number) => string;
  money0: (n: number) => string;
  price: (n: number) => string;
  num: (n: number | string) => string;
  pct: (n: number, d?: number) => string;
  round: (n: number, d?: number) => number;
  compact: (n: number) => string;
  sum: (items: unknown[], pick?: (x: never) => number) => number;
  fmtDate: (ts: number) => string;
  fmtDay: (ts: number) => string;
  fmtTime: (ts: number) => string;
  dayKey: (ts: number) => number;
  ago: (ts: number) => string;
  dur: (ms: number) => string;
  fmtImei: (s: string) => string;
  luhn: (s: string) => string;
  localMoney: (usd: number, cur: string) => string;
  maskEmail: (e: string) => string;
  B2C_FX: Record<string, number>;
};

// One-line `const name = ...;` statements copied out of a demo file.
function declaration(source: string, name: string): string {
  const found = new RegExp(`^const ${name} = .*;$`, 'm').exec(source);
  if (!found) throw new Error(`demo declaration not found: ${name}`);
  return found[0];
}

const demo = new Function(
  `${utilSource}
${['B2C_FX', 'B2C_SYM', 'localMoney'].map((name) => declaration(b2cDataSource, name)).join('\n')}
${declaration(b2cUiSource, 'maskEmail')}
return { money, money0, price, num, pct, round, compact, sum, fmtDate, fmtDay, fmtTime, dayKey, ago, dur, fmtImei, luhn, localMoney, maskEmail, B2C_FX };`,
)() as Demo;

const AMOUNTS = [0, 0.004, 0.5, 0.125, 1, 12.49, 999.995, 1234.5, -3.456, -0.4, 1e6, 123456789.123, -2500000];
const MOMENT = Date.UTC(2026, 2, 5, 14, 7, 9);

describe('money', () => {
  it.each(AMOUNTS)('money(%s) matches the demo', (n) => {
    expect(money(n)).toBe(demo.money(n));
    expect(money(n, 0)).toBe(demo.money(n, 0));
    expect(money(n, 3)).toBe(demo.money(n, 3));
    expect(money0(n)).toBe(demo.money0(n));
    expect(price(n)).toBe(demo.price(n));
  });

  it('accepts the API money string', () => {
    expect(money('12.4900')).toBe('$12.49');
    expect(money('-1234.5000')).toBe('-$1,234.50');
    expect(price('0.1250')).toBe('$0.125');
    expect(money0('1999.9999')).toBe('$2,000');
  });

  it('toAmount converts for display maths and keeps bad data visible', () => {
    expect(toAmount('12.4900')).toBe(12.49);
    expect(toAmount(7)).toBe(7);
    expect(toAmount('abc')).toBeNaN();
  });

  it.each([
    [10, 'GBP'],
    [1234.5, 'EUR'],
    [7, 'USD'],
    [99.99, 'SEK'],
    [5, 'CAD'],
    [12, 'AED'],
    [3.3, 'SAR'],
    [8, 'XYZ'],
  ])('lm(%s, %s) matches the demo when given the demo rate', (usd, currency) => {
    expect(lm(usd, currency, demo.B2C_FX[currency])).toBe(demo.localMoney(usd, currency));
  });

  it('lm shows an unknown currency by its code and takes string rates', () => {
    expect(lm('10.0000', 'GBP', '0.7900')).toBe('£7.90');
    expect(lm(1, 'ZZZ')).toBe('ZZZ 1.00');
  });
});

describe('numbers', () => {
  it.each([0, 1, 999, 1000, 1234567, 1234.56789, -4321, '42', '1000000'])('num(%s) matches the demo', (n) => {
    expect(num(n)).toBe(demo.num(n));
  });

  it.each([0, 5, 12.04, 12.5, 12.55, 99.95, 100, -3.25])('pct(%s) matches the demo', (n) => {
    expect(pct(n)).toBe(demo.pct(n));
    expect(pct(n, 0)).toBe(demo.pct(n, 0));
    expect(pct(n, 2)).toBe(demo.pct(n, 2));
  });

  it.each([1.005, 2.5, -1.234, 0, 1234.5678])('round(%s) matches the demo', (n) => {
    expect(round(n)).toBe(demo.round(n));
    expect(round(n, 0)).toBe(demo.round(n, 0));
    expect(round(n, 3)).toBe(demo.round(n, 3));
  });

  it.each([
    0, 7, 999, 1000, 1049, 1050, 9999, 10000, 15600, 999999, 1000000, 1500000, 9999999, 25000000, -1500,
    -15000,
  ])('compact(%s) matches the demo', (n) => {
    expect(compact(n)).toBe(demo.compact(n));
  });

  it('sum adds numbers or picked values', () => {
    expect(sum([1, 2, 3.5])).toBe(demo.sum([1, 2, 3.5]));
    const items = [{ v: 2 }, { v: 5 }];
    expect(sum(items, (x) => x.v)).toBe(demo.sum(items, (x: { v: number }) => x.v as never));
    expect(sum([])).toBe(0);
  });
});

describe('dates', () => {
  const moments = [
    MOMENT,
    0,
    Date.UTC(2026, 0, 1, 0, 0),
    Date.UTC(2025, 11, 31, 23, 59),
    Date.UTC(2026, 6, 15, 9, 5),
  ];

  it.each(moments)('fmtDate / fmtDay / fmtTime / dayKey match the demo for %s', (ts) => {
    expect(fmtDate(ts)).toBe(demo.fmtDate(ts));
    expect(fmtDay(ts)).toBe(demo.fmtDay(ts));
    expect(fmtTime(ts)).toBe(demo.fmtTime(ts));
    expect(dayKey(ts)).toBe(demo.dayKey(ts));
  });

  it('formats ISO strings and Date objects like the same epoch', () => {
    const iso = new Date(MOMENT).toISOString();
    expect(fmtDate(iso)).toBe(demo.fmtDate(MOMENT));
    expect(fmtDate(new Date(MOMENT))).toBe(demo.fmtDate(MOMENT));
    expect(dayKey(iso)).toBe(demo.dayKey(MOMENT));
  });

  it('returns an empty string for a missing or invalid time instead of throwing', () => {
    expect(fmtDate(null)).toBe('');
    expect(fmtDay(undefined)).toBe('');
    expect(fmtTime('not a date')).toBe('');
    expect(ago(null)).toBe('');
    expect(ago('')).toBe('');
  });

  describe('ago', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(MOMENT);
    });
    afterEach(() => vi.useRealTimers());

    it.each([
      0,
      10e3,
      44e3,
      45e3,
      90e3,
      59 * 60e3,
      3600e3,
      5 * 3600e3,
      23.6 * 3600e3,
      86400e3,
      3 * 86400e3,
      -5e3,
    ])('ago(now - %s ms) matches the demo', (age) => {
      expect(ago(MOMENT - age)).toBe(demo.ago(MOMENT - age));
    });

    it('can be given the clock explicitly', () => {
      expect(ago(MOMENT - 5 * 60e3, MOMENT)).toBe('5m ago');
      expect(ago(new Date(MOMENT - 3 * 3600e3).toISOString(), MOMENT)).toBe('3h ago');
    });
  });

  it.each([
    0, 1, 999, 1000, 1500, 9999, 10000, 59999, 60000, 90000, 3599000, 3600000, 5400000, 86399000, 86400000,
    129600000,
  ])('dur(%s) matches the demo', (ms) => {
    expect(dur(ms)).toBe(demo.dur(ms));
  });
});

describe('text', () => {
  it.each(['jane.doe@example.com', 'ab@x.io', 'a@b.c', 'no-at-sign', 'x.y.z@sub.domain.org'])(
    'maskEmail(%s) matches the demo',
    (email) => {
      expect(maskEmail(email)).toBe(demo.maskEmail(email));
    },
  );

  it.each(['351234567890123', '12345', '35123456789012a', ''])('fmtImei(%s) matches the demo', (imei) => {
    expect(fmtImei(imei)).toBe(demo.fmtImei(imei));
  });

  it.each(['35123456789012', '49015420323751', '00000000000000', '99999999999999'])(
    'luhn(%s) matches the demo',
    (base) => {
      expect(luhn(base)).toBe(demo.luhn(base));
    },
  );
});

describe('ageText', () => {
  it('writes the two largest units with non-breaking spaces', () => {
    expect(ageText(20_000)).toBe('<1m');
    expect(ageText(45 * 60_000)).toBe('45m');
    expect(ageText(125 * 60_000)).toBe('2h 5m');
    expect(ageText(120 * 60_000)).toBe('2h');
    expect(ageText((3 * 24 + 4) * 3_600_000)).toBe('3d 4h');
    expect(ageText(-5)).toBe('<1m');
  });
});
