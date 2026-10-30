// Maps the demo's payment methods, tax table and currencies (`S.settings.gateways`, `taxes`, `currencies` in 12-state-b2c.js) to
// the API's rows. The demo keeps fees as text and has no limits or groups, so those are read from the text or made up.
import { demoNumericId, toIso, toMoney } from '@/mocks/seed';
import type { Currency, GatewayAudience, PaymentGateway, TaxRate } from '../types';

type DemoGateway = {
  id: string;
  name: string;
  desc: string;
  audience: string;
  methods: string;
  fee: string;
  refunds: boolean;
  threeDS: boolean;
  on: boolean;
  mode: string;
  volume: number;
};
type DemoTax = { cc: string; name: string; rate: number; type: string; scheme: string; since: number };
type DemoCurrency = {
  code: string;
  rate: number;
  markup: number;
  updated: number;
  shown: boolean;
  charm: boolean;
};

const AUDIENCE: Record<string, GatewayAudience> = { B2C: 'b2c', B2B: 'b2b', 'B2C and B2B': 'both' };

// Limits and holds the demo does not have: a card is quick and small, a bank transfer is manual and large.
const LIMITS: Record<string, { min: number; max: number; hold: number; groups: number[] }> = {
  card: { min: 1, max: 2000, hold: 0, groups: [] },
  crypto: { min: 5, max: 10000, hold: 0, groups: [] },
  bank: { min: 50, max: 50000, hold: 24, groups: [2, 3] },
  wise: { min: 50, max: 50000, hold: 24, groups: [] },
};

/** "2.9% + $0.30" is 2.9 percent and 0.30 dollars; "Free" is nothing. */
export function parseFee(text: string): { percent: number; fixed: number } {
  const percent = /([\d.]+)\s*%/.exec(text);
  const fixed = /\$([\d.]+)/.exec(text);
  return { percent: percent ? Number(percent[1]) : 0, fixed: fixed ? Number(fixed[1]) : 0 };
}

/** The payment methods as `GET /admin/payment-gateways` sends them. */
export function gatewayRows(rows: DemoGateway[]): PaymentGateway[] {
  return rows.map((row, index) => {
    const driver = row.methods.split(',')[0].trim();
    const limits = LIMITS[driver] ?? LIMITS.card;
    const fee = parseFee(row.fee);
    return {
      id: demoNumericId(row.id),
      code: driver,
      driver,
      name: row.name,
      audience: AUDIENCE[row.audience] ?? 'b2c',
      feePercent: toMoney(fee.percent),
      feeFixed: toMoney(fee.fixed),
      minAmount: toMoney(limits.min),
      maxAmount: toMoney(limits.max),
      allowedGroupIds: limits.groups,
      supportsRefunds: row.refunds,
      supports3ds: row.threeDS,
      isManual: row.mode === 'Manual',
      instructions: row.desc,
      holdHours: limits.hold,
      isActive: row.on,
      createdAt: toIso(Date.now() - (30 - index) * 86_400_000),
      secretHint: row.mode === 'Manual' ? null : `••••${(4000 + index * 137).toString(16)}`,
      volume30d: row.volume ? toMoney(row.volume) : null,
    };
  });
}

/** The tax table as `GET /admin/tax-rates` sends it: one row per country, in force from the demo's "since" date. */
export function taxRows(rows: DemoTax[]): TaxRate[] {
  return rows.map((row, index) => ({
    id: index + 1,
    country: row.cc,
    region: '',
    ratePercent: toMoney(row.rate),
    taxType: row.rate ? 'vat' : 'none',
    appliesTo: 'digital_services',
    validFrom: toIso(row.since),
    validTo: null,
    label: row.rate ? `${row.name} VAT` : `${row.name}: no tax collected`,
    ossScheme: row.scheme === 'Not collected' ? '' : row.scheme,
    createdAt: toIso(row.since),
  }));
}

const CURRENCY_NAMES: Record<string, string> = {
  USD: 'US dollar',
  GBP: 'Pound sterling',
  EUR: 'Euro',
  SEK: 'Swedish krona',
  CAD: 'Canadian dollar',
  AED: 'UAE dirham',
  SAR: 'Saudi riyal',
};

/** The currencies as `GET /admin/currencies` sends them; `updated` becomes the time the rate was last refreshed. */
export function currencyRows(rows: DemoCurrency[]): Currency[] {
  return rows.map((row, index) => ({
    id: index + 1,
    code: row.code,
    name: CURRENCY_NAMES[row.code] ?? row.code,
    rateToBase: toMoney(row.rate),
    rateUpdatedAt: toIso(row.updated),
    markupPercent: toMoney(row.markup),
    charmRounding: row.charm,
    isStorefront: row.shown,
    decimals: 2,
    isActive: true,
    createdAt: toIso(row.updated),
  }));
}

export type { DemoCurrency, DemoGateway, DemoTax };
