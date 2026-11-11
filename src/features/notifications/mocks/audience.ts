// The people the mock campaigns reach: a small made-up audience (6 staff, 28 merchants, 80 customers) with the facts the server's providers know (can see an
// inbox, may be emailed, has a Telegram chat, reads English or Arabic, agreed to marketing), so the live count, the send and the recipients agree with each other.
// Mocks fake answers only (decision 014): the real server counts the real people.
import type {
  AudiencePreview,
  AudienceSpec,
  CampaignChannel,
  CampaignPurpose,
  CampaignLocale,
  PersonType,
} from '../types';

/** One person of the made-up audience, with how each channel reaches them. */
export type MockPerson = {
  type: PersonType;
  id: number;
  inApp: boolean;
  email: boolean;
  telegram: boolean;
  locale: CampaignLocale;
  /** Customers only: agreed to marketing. Everyone else is true. */
  consent: boolean;
};

const COUNTRIES = ['JO', 'SA', 'AE', 'EG', 'KW'];
const STAFF_COUNT = 6;
const MERCHANT_COUNT = 28;
const ACTIVE_MERCHANTS = 24;
const CUSTOMER_COUNT = 80;
const CUSTOMERS_WITH_ACCOUNT = 60;

const staff = (id: number) => ({ type: 'staff' as const, id, roleId: ((id - 1) % 6) + 1 });
const merchant = (id: number) => ({
  type: 'client' as const,
  id,
  pending: id > ACTIVE_MERCHANTS,
  groupId: (id % 3) + 1,
  country: COUNTRIES[id % 4],
});
const customer = (id: number) => ({
  type: 'customer' as const,
  id,
  hasAccount: id <= CUSTOMERS_WITH_ACCOUNT,
  country: COUNTRIES[id % 5],
  locale: (id % 4 === 0 ? 'ar' : 'en') as CampaignLocale,
});

/** A merchant who switched the announcement email off (about one in twenty-five), and one with a linked Telegram chat (three in five). */
const merchantEmail = (id: number) => id % 25 !== 0;
const merchantTelegram = (id: number) => id % 5 < 3;
/** A customer agrees to marketing seven times in ten. */
const customerConsent = (id: number) => id % 10 < 7;

/** Everyone the spec targets who is eligible, before consent: staff, merchants and customers, in the server's order, minus the people left out. */
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
      out.push({ type: 'staff', id, inApp: true, email: true, telegram: false, locale: 'en', consent: true });
  }
  for (let id = 1; id <= MERCHANT_COUNT; id++) {
    const row = merchant(id);
    const segment = spec.merchants;
    const statuses = segment?.statuses ?? ['active'];
    const inSegment =
      segment &&
      statuses.includes(row.pending ? 'pending' : 'active') &&
      (!segment.groupIds || segment.groupIds.includes(row.groupId)) &&
      (!segment.countries || segment.countries.includes(row.country));
    if (inSegment || include.has(`client:${id}`))
      out.push({
        type: 'client',
        id,
        inApp: true,
        email: merchantEmail(id),
        telegram: merchantTelegram(id),
        locale: 'en',
        consent: true,
      });
  }
  for (let id = 1; id <= CUSTOMER_COUNT; id++) {
    const row = customer(id);
    const segment = spec.customers;
    const inSegment =
      segment &&
      (segment.hasAccount === undefined || segment.hasAccount === row.hasAccount) &&
      (!segment.countries || segment.countries.includes(row.country)) &&
      (!segment.locales || segment.locales.includes(row.locale));
    if (!inSegment && !include.has(`customer:${id}`)) continue;
    if (purpose === 'marketing' && !customerConsent(id)) {
      noConsent += 1;
      continue;
    }
    out.push({
      type: 'customer',
      id,
      inApp: row.hasAccount,
      email: true,
      telegram: false,
      locale: row.locale,
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
    (wants('in_app') && person.inApp) ||
    (wants('email') && person.email) ||
    (wants('telegram') && person.telegram);
  const reachable = people.filter(reached);
  const count = (pick: (person: MockPerson) => boolean) => reachable.filter(pick).length;
  const wasted = (pick: (person: MockPerson) => boolean) => people.filter(pick).length;
  return {
    total: people.length,
    reachable: reachable.length,
    byType: {
      staff: count((p) => p.type === 'staff'),
      client: count((p) => p.type === 'client'),
      customer: count((p) => p.type === 'customer'),
    },
    byChannel: {
      inApp: wants('in_app') ? count((p) => p.inApp) : 0,
      email: wants('email') ? count((p) => p.email) : 0,
      telegram: wants('telegram') ? count((p) => p.telegram) : 0,
    },
    byLocale: { en: count((p) => p.locale === 'en'), ar: count((p) => p.locale === 'ar') },
    excluded: {
      noConsent,
      optedOut: wants('email') ? wasted((p) => !p.email) : 0,
      noTelegram: wants('telegram') ? wasted((p) => p.type === 'client' && !p.telegram) : 0,
      noAccount: wants('in_app') ? wasted((p) => !p.inApp) : 0,
    },
  };
}

/** The mock audience's size, for the seed's text. */
export const MOCK_AUDIENCE = {
  staff: STAFF_COUNT,
  merchants: MERCHANT_COUNT,
  customers: CUSTOMER_COUNT,
} as const;
