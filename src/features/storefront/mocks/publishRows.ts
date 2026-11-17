// The 60 rows of the Publish tab's mock preview, written to show every state, blocking reason and flag of the plan (section 3.2 of
// the backend brief). The mock does no price, title or slug arithmetic (M92): every figure below is typed in, as a server's answer
// would read. The rows are a table of text, one line each: raw supplier name | clean title | brand | carrier | country | category |
// price row | marks. Real services of the storefront mock (ids 15 to 27) are marked `S:<id>`; the others are made up (ids 101 and up).
// The one line of Arabic script is built from code points, as the English guard asks.
import type { ServiceType } from '@/features/orders';
import { slugOf } from './http';
import type { MockService } from './types';
import type {
  PublishBlockReason,
  PublishBrandKind,
  PublishFlag,
  PublishItem,
  PublishPriceMode,
  PublishState,
} from '../types';

/** Cost, floor, the rule's price and the margin of that price, as the server would send them (fixed text, never worked out). */
const PRICES = [
  ['0.1000', '0.1700', '0.2400', '58.3333'],
  ['0.5000', '0.5800', '0.6500', '23.0769'],
  ['2.4000', '2.8000', '3.1500', '23.8095'],
  ['5.6000', '6.5300', '7.2900', '23.1824'],
  ['7.2000', '8.3900', '8.9900', '19.9110'],
  ['9.8000', '11.4200', '12.9900', '24.5574'],
  ['13.5000', '15.7400', '16.9900', '20.5415'],
  ['24.0000', '27.9800', '29.9900', '19.9733'],
  ['7.2000', '8.3900', '8.3900', '14.1836'],
] as const;

const LONG =
  'Unlock iPhone 11 12 13 14 15 Pro Max All Carriers USA Canada UK Australia 1-5 Days Clean Barred Unpaid Bills';
const TOO_LONG = `${LONG} ${LONG} Service`;
const ARABIC_NAME = String.fromCodePoint(
  0x62e,
  0x62f,
  0x645,
  0x629,
  0x20,
  0x641,
  0x643,
  0x20,
  0x627,
  0x644,
  0x642,
  0x641,
  0x644,
);

// raw | title | brand | carrier | country | category | price row | marks (R review, B:reason, F:flags, K:tool|app, T:type, S:service,
// E:price:margin keep, X:price:margin typed, P:price replaces, N no rule, Z no cost)
const ROWS = `
AT&amp;T USA Premier Unlock [Clean] 1-3 Days | AT&T USA Premier Unlock | Apple | AT&T | US | Carrier unlock | 6
T-Mobile USA Unlock (Clean IMEI) 24h | T-Mobile USA Unlock | Apple | T-Mobile | US | Carrier unlock | 5
Verizon USA Clean Unlock | Verizon USA Clean Unlock | Apple | Verizon | US | Carrier unlock | 4 | P:8.4900
Vodafone UK iPhone Unlock Fast | Vodafone UK iPhone Unlock | Apple | Vodafone | GB | Carrier unlock | 4 | X:9.9900:27.9279
EE UK Unlock Clean/Barred [ | EE UK Unlock | Apple | EE | GB | Carrier unlock | 4 | F:brackets_repaired
Orange France iPhone Unlock | Orange France iPhone Unlock | Apple | Orange | FR | Carrier unlock | 5
O2 UK Unlock 1-2 Days | O2 UK Unlock | Apple | O2 | GB | Carrier unlock | 8 | F:price_at_floor
Sprint USA Unlock (Clean) PREMIUM | Sprint USA Unlock | Apple | Sprint | US | Carrier unlock | 5 | F:marketing_kept
Telus Canada Unlock | Telus Canada Unlock | Apple | Telus | CA | Carrier unlock | 4
Rogers Canada Unlock | Rogers Canada Unlock | Apple | Rogers | CA | Carrier unlock | 4
Bell Canada Unlock | Bell Canada Unlock | | Bell | CA | Carrier unlock | 4 | F:title_lacks_brand
Cricket USA Unlock | Cricket USA Unlock | Apple | Cricket | | Carrier unlock | 5 | F:carrier_no_country
Telstra Australia Unlock | Telstra Australia Unlock | Apple | Telstra | AU | Carrier unlock | 6
Docomo Japan Unlock [Clean] | NTT Docomo Japan Unlock | Apple | NTT Docomo | JP | Carrier unlock | 6 | F:country_from_group
SFR France Unlock | SFR France Unlock | Apple | SFR | FR | Carrier unlock | 5
iPhone Carrier + SimLock Check | iPhone Carrier and SimLock Check | Apple | | | Apple | 0
Samsung Info (KG / FRP / Region) Pro | Samsung Info Check KG FRP Region Carrier Lock Status Warranty Date and Model Number Fast | Samsung | | | Samsung | 0 | F:title_81_100
Blacklist Status GSMA Pro | GSMA Blacklist Status Check | | | | Generic | 0 | F:no_brand
Xiaomi Mi Account Status Check | Xiaomi Mi Account Status Check | Xiaomi | | | Xiaomi | 1
Apple Model + Capacity + Color Check | Apple Model Capacity and Color Check | Apple | | | Apple | 1 | E:6.9900:19.8856 F:price_kept
${LONG} | ${LONG} | Apple | | | Apple | 5 | R F:title_long
${LONG} (Fast) | ${LONG} Fast | Apple | | | Apple | 5 | R F:title_long
Vodafone Germany Unlock | Vodafone Germany Unlock | Apple | Vodafone | DE | Carrier unlock | 4 | R F:duplicate_name
Vodafone Germany Unlock | Vodafone Germany Unlock | Apple | Vodafone | DE | Carrier unlock | 4 | R F:duplicate_name,slug_suffixed
Telcel Mexico Unlock | Telcel Mexico Unlock | Apple | Telcel | MX | Carrier unlock | 4 | R F:duplicate_name
Telcel Mexico Unlock | Telcel Mexico Unlock | Apple | Telcel | MX | Carrier unlock | 4 | R F:duplicate_name,slug_suffixed
iPhone SIM Lock Check | iPhone SIM Lock Check | Apple | | | Apple | 0 | R F:title_taken
Samsung Network Unlock Code | Samsung Network Unlock Code | Samsung | | | Samsung | 3 | R F:title_taken
Unlock Credits 1 QNT = 1000 Units | Unlock Credits 1 QNT 1000 Units | | | | Credits | 5 | R T:server F:quantity_text,no_brand
Server Credits 1 QNT = 50 | Server Credits 1 QNT 50 | | | | Credits | 3 | R T:server F:quantity_text,no_brand
Orange Europe Unlock (FR/ES/PL/BE/NL) | Orange Europe Unlock | Apple | Orange | | Carrier unlock | 5 | R F:multi_country
Huawei ID Remove | Huawei ID Removal | Huawei | | | Generic | 4 | B:service_disabled
Oppo Unlock | Oppo Unlock | Oppo | | | Generic | 3 | B:service_disabled
Legacy BlackBerry Unlock | BlackBerry Unlock | BlackBerry | | | Generic | 2 | B:category_inactive
Wholesale Carrier Unlock | Wholesale Carrier Unlock | Apple | | | Carrier unlock | 5 | B:b2b_only
Sony Xperia Unlock | Sony Xperia Unlock | Sony | | | Generic | 3 | B:supplier_unavailable
LG Unlock | LG Unlock | LG | | | Generic | 3 | B:supplier_unavailable
${ARABIC_NAME} | | | | | Generic | 1 | B:title_missing
${TOO_LONG} | ${TOO_LONG} | Apple | | | Apple | 5 | B:title_too_long
Nokia Unlock Code | Nokia Unlock Code | Nokia | | | Generic | 3 | B:price_missing N
Motorola Network Unlock | Motorola Network Unlock | Motorola | | | Generic | 3 | B:price_missing N
Alcatel Unlock Code | Alcatel Unlock Code | Alcatel | | | Generic | 3 | B:price_missing N
ZTE Account Remove | ZTE Account Removal | ZTE | | | Generic | 1 | B:price_missing Z
Free Test Check | Free Test Check | | | | Generic | 0 | B:price_missing Z
Realme Unlock Pro | Realme Unlock | Realme | | | Generic | 4 | B:below_floor X:6.5000:-10.7692
Honor Unlock Pro | Honor Unlock | Honor | | | Generic | 3 | B:slug_taken
Motorola USA Unlock | Motorola USA Unlock | Motorola | | US | Generic | 3
= | Z3X Credits x10 | Z3X | | | | 4 | S:15 K:tool
= | UnlockTool 1-Day License | UnlockTool | | | | 3 | S:16 K:tool
= | Chimera Tool 1 Month | Chimera Tool | | | | 8 | S:17 K:tool F:price_at_floor
= | NCK Dongle Credits x50 | NCK Dongle | | | | 5 | S:18 K:tool
= | Miracle Box Credits x20 | Miracle Box | | | | 4 | S:19 K:tool
= | Samsung FRP Remote USB | Samsung | | | | 4 | S:20
= | Xiaomi Mi Account Remote | Xiaomi | | | | 4 | S:21
= | iPhone Passcode Remote | Apple | | | | 5 | S:22
= | Huawei ID Remote | Huawei | | | | 4 | S:23
= | Samsung Combination File | Samsung | | | | 1 | S:24 B:not_orderable
= | Xiaomi EDL Auth File | Xiaomi | | | | 2 | S:25 B:not_orderable
= | Qualcomm Dump File | Qualcomm | | | | 1 | S:26 B:not_orderable
= | Huawei update.app Firmware | Huawei | | | | 1 | S:27 B:not_orderable
`;

type Spec = {
  raw: string;
  title: string;
  brand: string;
  carrier: string;
  country: string;
  category: string;
  price: number;
  state: PublishState;
  reason: PublishBlockReason | null;
  flags: PublishFlag[];
  kind: PublishBrandKind | null;
  type: ServiceType;
  serviceId: number | null;
  typed: [string, string] | null;
  existing: [string, string] | null;
  replaces: string | null;
  noRule: boolean;
  noCost: boolean;
};

/** One line of the table as a spec. */
function parse(line: string): Spec {
  const [raw, title, brand, carrier, country, category, price, marks = ''] = line
    .split('|')
    .map((cell) => cell.trim());
  const spec: Spec = {
    raw,
    title,
    brand,
    carrier,
    country,
    category,
    price: Number(price),
    state: 'ready',
    reason: null,
    flags: [],
    kind: null,
    type: 'imei',
    serviceId: null,
    typed: null,
    existing: null,
    replaces: null,
    noRule: false,
    noCost: false,
  };
  for (const mark of marks.split(/\s+/).filter(Boolean)) {
    const [key, ...rest] = mark.split(':');
    const value = rest.join(':');
    if (key === 'R') spec.state = 'review';
    else if (key === 'B') [spec.state, spec.reason] = ['blocked', value as PublishBlockReason];
    else if (key === 'F') spec.flags = value.split(',') as PublishFlag[];
    else if (key === 'K') spec.kind = value as PublishBrandKind;
    else if (key === 'T') spec.type = value as ServiceType;
    else if (key === 'S') spec.serviceId = Number(value);
    else if (key === 'X') spec.typed = value.split(':') as [string, string];
    else if (key === 'E') spec.existing = value.split(':') as [string, string];
    else if (key === 'P') spec.replaces = value;
    else if (key === 'N') spec.noRule = true;
    else if (key === 'Z') spec.noCost = true;
  }
  return spec;
}

/** The rule that would price a row (the names the Retail pricing mock's seed gives its rules 1 to 3). */
function ruleOf(spec: Spec): { id: number; label: string } {
  if (spec.category === 'Carrier unlock')
    return { id: 3, label: 'Carrier unlock +20% +$0.50, up to 5 cents' };
  return spec.type === 'imei'
    ? { id: 2, label: 'IMEI +30%' }
    : { id: 1, label: 'Every service +25%, ends in .99' };
}

/** The 60 rows of the preview, ids 1 to 60. `services` and `categories` are the storefront mock's own (the real rows read them). */
export function buildPublishItems(
  services: ReadonlyMap<number, MockService>,
  categories: ReadonlyMap<number, string>,
  at: string,
): PublishItem[] {
  return ROWS.trim()
    .split('\n')
    .map((line, index): PublishItem => {
      const spec = parse(line);
      const real = spec.serviceId === null ? undefined : services.get(spec.serviceId);
      const serviceId = spec.serviceId ?? 101 + index;
      const [cost, floor, rulePrice, ruleMargin] = PRICES[spec.price];
      const priced = !spec.noRule && !spec.noCost;
      const name = real?.name ?? spec.raw;
      const type = real?.type ?? spec.type;
      const [mode, retail, margin]: [PublishPriceMode, string | null, string | null] = spec.typed
        ? ['manual', spec.typed[0], spec.typed[1]]
        : spec.existing
          ? ['keep', spec.existing[0], spec.existing[1]]
          : priced
            ? ['rule', rulePrice, ruleMargin]
            : ['rule', null, null];
      const flags = [
        ...spec.flags,
        ...(spec.reason === 'price_missing' ? [spec.noCost ? 'no_cost' : 'no_rule'] : []),
      ];
      const slug = slugOf(spec.title) + (spec.flags.includes('slug_suffixed') ? '-2' : '');
      const detected = {
        title: spec.title,
        slug,
        brand: spec.brand,
        brandKind: spec.kind ?? (spec.brand ? ('device' as const) : null),
        carrier: spec.carrier,
        country: spec.country,
      };
      return {
        id: index + 1,
        serviceId,
        service: {
          id: serviceId,
          name,
          code: real?.code ?? `IMP-${serviceId}`,
          type,
          categoryName: (real && categories.get(real.categoryId)) ?? spec.category,
        },
        title: spec.title,
        slug,
        brand: spec.brand,
        carrier: spec.carrier,
        country: spec.country,
        detected,
        edited: false,
        cost: spec.noCost ? '0.0000' : cost,
        floorPrice: floor,
        rule: spec.noRule ? null : ruleOf({ ...spec, type }),
        rulePrice: priced ? rulePrice : null,
        priceMode: mode,
        existingPrice: spec.existing?.[0] ?? spec.replaces ?? null,
        replacesPrice: spec.replaces,
        retailPrice: spec.replaces ? rulePrice : retail,
        marginPct: spec.replaces ? ruleMargin : margin,
        state: spec.state,
        blockedReason: spec.reason,
        flags: flags as PublishFlag[],
        included: spec.state === 'ready',
        evaluatedAt: at,
        result: null,
        resultReason: null,
        resultDetail: null,
        listingId: null,
        publishedPrice: null,
        listingListed: null,
      };
    });
}
