// The people the mock campaigns reach: a small made-up audience (6 staff, 28 merchant accounts, 80 retail accounts) with the facts the server's providers know (can see an
// inbox, may be emailed, agreed to marketing), so the live count, the send and the recipients agree with each other. A merchant keeps its number as the account
// id and retail buyer `n` is account `100 + n` (`@/mocks/seed/accountIds`), so a person picked from the accounts mock is a person of this audience.
// Mocks fake answers only (decision 014): the real server counts the real people.
import { customerAccountId, merchantAccountId } from '@/mocks/seed/accountIds';
import type { AudiencePreview, AudienceSpec, CampaignChannel, CampaignPurpose, PersonType } from '../types';

/** The kind a made-up person has: staff, an account of a merchant rank or an account of a retail rank. */
export type MockKind = 'staff' | 'merchant' | 'retail';

/** One person of the made-up audience, with how each channel reaches them. */
export type MockPerson = {
  type: PersonType;
  kind: MockKind;
  /** The staff number, or the account id. */
  id: number;
  inApp: boolean;
  email: boolean;
  /** Retail accounts only: agreed to marketing. Everyone else is true. */
  consent: boolean;
};

const COUNTRIES = ['JO', 'SA', 'AE', 'EG', 'KW'];
const STAFF_COUNT = 6;
const MERCHANT_COUNT = 28;
const ACTIVE_MERCHANTS = 24;
const RETAIL_COUNT = 80;
const RETAIL_WITH_LOGIN = 60;

const staff = (id: number) => ({ id, roleId: ((id - 1) % 6) + 1 });
/** Merchant `n` of the made-up audience: the account of that number. Those past the active ones are suspended, so a segment never reaches them. */
const merchant = (n: number) => ({
  id: merchantAccountId(n),
  active: n <= ACTIVE_MERCHANTS,
  rankId: (n % 3) + 1,
  country: COUNTRIES[n % 4],
});
/** Retail buyer `n`: account `100 + n`; the first ones have a login, the rest are guests. */
const retail = (n: number) => ({
  id: customerAccountId(n),
  hasAccount: n <= RETAIL_WITH_LOGIN,
  country: COUNTRIES[n % 5],
});

/** A merchant who switched the announcement email off (about one in twenty-five). */
const merchantEmail = (n: number) => n % 25 !== 0;
/** A retail account agrees to marketing seven times in ten. */
const retailConsent = (n: number) => n % 10 < 7;

/** Everyone the spec targets who is eligible, before consent: staff, merchants and retail accounts, in the server's order, minus the people left out. */
export function eligiblePeople(
  spec: AudienceSpec,
  purpose: CampaignPurpose,
): { people: MockPerson[]; noConsent: number } {
  const out: MockPerson[] = [];
  const include = new Set((spec.include ?? []).map((p) => `${p.type}:${p.id}`));
  const exclude = new Set((spec.exclude ?? []).map((p) => `${p.type}:${p.id}`));
  let noConsent = 0;

  for (let id = 1; id <= STAFF_COUNT; id++) {
    const row = staff(id);
    const inSegment = spec.staff && (!spec.staff.roleIds || spec.staff.roleIds.includes(row.roleId));
    if (inSegment || include.has(`staff:${id}`))
      out.push({ type: 'staff', kind: 'staff', id, inApp: true, email: true, consent: true });
  }
  for (let n = 1; n <= MERCHANT_COUNT; n++) {
    const row = merchant(n);
    const segment = spec.merchants;
    const inSegment =
      segment &&
      row.active &&
      (!segment.groupIds || segment.groupIds.includes(row.rankId)) &&
      (!segment.countries || segment.countries.includes(row.country));
    if (inSegment || include.has(`account:${row.id}`))
      out.push({
        type: 'account',
        kind: 'merchant',
        id: row.id,
        inApp: true,
        email: merchantEmail(n),
        consent: true,
      });
  }
  for (let n = 1; n <= RETAIL_COUNT; n++) {
    const row = retail(n);
    const segment = spec.customers;
    const inSegment =
      segment &&
      (segment.hasAccount === undefined || segment.hasAccount === row.hasAccount) &&
      (!segment.countries || segment.countries.includes(row.country));
    if (!inSegment && !include.has(`account:${row.id}`)) continue;
    if (purpose === 'marketing' && !retailConsent(n)) {
      noConsent += 1;
      continue;
    }
    out.push({
      type: 'account',
      kind: 'retail',
      id: row.id,
      inApp: row.hasAccount,
      email: true,
      consent: true,
    });
  }
  return { people: out.filter((person) => !exclude.has(`${person.type}:${person.id}`)), noConsent };
}

/** The live count the server would answer for this audience, channels and purpose. */
export function previewOf(
  spec: AudienceSpec,
  channels: readonly CampaignChannel[],
  purpose: CampaignPurpose,
): AudiencePreview {
  const { people, noConsent } = eligiblePeople(spec, purpose);
  const wants = (channel: CampaignChannel) => channels.includes(channel);
  const reached = (person: MockPerson) =>
    (wants('in_app') && person.inApp) || (wants('email') && person.email);
  const reachable = people.filter(reached);
  const count = (pick: (person: MockPerson) => boolean) => reachable.filter(pick).length;
  const wasted = (pick: (person: MockPerson) => boolean) => people.filter(pick).length;
  return {
    total: people.length,
    reachable: reachable.length,
    byType: {
      staff: count((p) => p.kind === 'staff'),
      merchant: count((p) => p.kind === 'merchant'),
      retail: count((p) => p.kind === 'retail'),
    },
    byChannel: {
      inApp: wants('in_app') ? count((p) => p.inApp) : 0,
      email: wants('email') ? count((p) => p.email) : 0,
    },
    excluded: {
      noConsent,
      optedOut: wants('email') ? wasted((p) => !p.email) : 0,
      noAccount: wants('in_app') ? wasted((p) => !p.inApp) : 0,
    },
  };
}

/** The mock audience's size, for the seed's text. */
export const MOCK_AUDIENCE = {
  staff: STAFF_COUNT,
  merchants: MERCHANT_COUNT,
  activeMerchants: ACTIVE_MERCHANTS,
  retail: RETAIL_COUNT,
} as const;
