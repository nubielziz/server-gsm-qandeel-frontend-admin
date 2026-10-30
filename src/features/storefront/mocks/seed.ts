// Builds the mock stores from the demo's own seed (`S.services`, `S.retail`, `S.listings`, `S.orders`, `S.landing`, `S.pages`,
// `S.legal`, `S.help`, `S.tac`), mapped to the API's shapes. The demo has no page text, answers or legal text, so short texts
// are made up, and it has no draft legal version, so one is added (a Refund policy v1.5) for the Publish button to work on.
import { Collection } from '@/mocks/db';
import { demoNumericId, demoRows, toIso, type DemoState } from '@/mocks/seed';
import type { ContentPage, HelpArticle, LegalDocument, PageKind, PageStatus, TacEntry } from '../types';
import type { MockListing, MockSales, MockService, Stores } from './types';

const DAY = 86_400_000;

type DemoService = {
  id: string;
  code: string;
  name: string;
  status: 'active' | 'disabled';
  price: number;
  cost: number;
};
type DemoListing = {
  sid: string;
  slug: string;
  title: string;
  listed: boolean;
  locked: boolean;
  why: string;
  featured: boolean;
};
type DemoOrder = { sid: string; cid?: string; status: string; created: number; price: number };
type DemoLanding = {
  title: string;
  slug: string;
  kind: PageKind;
  status: PageStatus;
  views: number;
  orders: number;
  updated: number;
};
type DemoPage = { title: string; slug: string; kind: PageKind; status: PageStatus; updated: number };
type DemoLegal = {
  type: string;
  version: string;
  lang: string;
  effective: number;
  current: boolean;
  accepted: number;
  needs: boolean;
};
type DemoHelp = { cat: string; q: string; yes: number; no: number; status: 'published' | 'draft' };
type DemoTac = { tac: string; brand: string; model: string; code: string; year: number };

// The demo's document names as the API's type words.
const LEGAL_TYPE: Record<string, string> = {
  'Terms of service': 'terms',
  'Privacy policy': 'privacy',
  'Refund policy': 'refund',
  'Cookie policy': 'cookies',
};

/** The demo's `listings` and `retail`, with the services they point at. */
function listingStores(state: DemoState, now: number) {
  const services = new Map<number, MockService>();
  const retail = new Map<number, number>();
  const prices = (state.retail ?? {}) as Record<string, number>;
  for (const s of demoRows<DemoService>(state, 'services')) {
    const id = demoNumericId(s.id);
    services.set(id, { id, name: s.name, code: s.code, status: s.status, basePrice: s.price, cost: s.cost });
    if (prices[s.code]) retail.set(id, prices[s.code]);
  }
  const listings = new Collection<MockListing>(
    demoRows<DemoListing>(state, 'listings').map((l, index) => ({
      id: index + 1,
      serviceId: demoNumericId(l.sid),
      locale: 'en',
      slug: l.slug,
      publicTitle: l.title,
      isListed: l.listed,
      isFeatured: l.featured,
      lockedReason: l.locked ? l.why : null,
    })),
  );
  // Storefront orders of the last 30 days that were not rejected (the demo's `listingRows`).
  const sales = new Map<number, MockSales>();
  for (const o of demoRows<DemoOrder>(state, 'orders')) {
    if (!o.cid || o.status === 'rejected' || now - o.created >= 30 * DAY) continue;
    const id = demoNumericId(o.sid);
    const was = sales.get(id) ?? { orders: 0, revenue: 0 };
    sales.set(id, { orders: was.orders + 1, revenue: was.revenue + o.price });
  }
  return { services, retail, listings, sales };
}

const bodyFor = (title: string) => `# ${title}\n\nText for ${title} goes here.`;

/** Landing pages first (ids 1 to 14), then the static pages and blog posts (ids 15 to 20): one table in the API. */
function pageRows(state: DemoState): ContentPage[] {
  const row = (
    id: number,
    p: DemoLanding | DemoPage,
    figures: { visits30d: number | null; orders30d: number | null },
  ): ContentPage => ({
    id,
    kind: p.kind,
    slug: p.slug,
    locale: 'en',
    title: p.title,
    bodyMd: bodyFor(p.title),
    seoTitle: p.title,
    seoDescription: '',
    status: p.status,
    publishedAt: p.status === 'published' ? toIso(p.updated) : null,
    createdAt: toIso(p.updated - 30 * DAY),
    updatedAt: toIso(p.updated),
    ...figures,
  });
  const landing = demoRows<DemoLanding>(state, 'landing').map((p, i) =>
    row(i + 1, p, { visits30d: p.views, orders30d: p.orders }),
  );
  const pages = demoRows<DemoPage>(state, 'pages').map((p, i) =>
    row(landing.length + i + 1, p, { visits30d: null, orders30d: null }),
  );
  return [...landing, ...pages];
}

/** The demo's legal documents plus one draft version, so a Publish is possible. */
function legalRows(state: DemoState, now: number): LegalDocument[] {
  const rows = demoRows<DemoLegal>(state, 'legal').map((d, i): LegalDocument => ({
    id: i + 1,
    type: LEGAL_TYPE[d.type] ?? d.type.toLowerCase(),
    version: d.version,
    locale: d.lang.toLowerCase(),
    bodyMd: bodyFor(`${d.type} v${d.version}`),
    effectiveFrom: toIso(d.effective),
    isCurrent: d.current,
    requiresReacceptance: d.needs,
    createdAt: toIso(d.effective),
    acceptedCount: d.accepted,
  }));
  rows.push({
    id: rows.length + 1,
    type: 'refund',
    version: '1.5',
    locale: 'en',
    bodyMd: bodyFor('Refund policy v1.5'),
    effectiveFrom: null,
    isCurrent: false,
    requiresReacceptance: true,
    createdAt: toIso(now - DAY),
    acceptedCount: null,
  });
  return rows;
}

function helpRows(state: DemoState, now: number): HelpArticle[] {
  return demoRows<DemoHelp>(state, 'help').map((h, i) => ({
    id: i + 1,
    category: h.cat,
    question: h.q,
    answerMd: `Short answer to "${h.q}".`,
    locale: 'en',
    isPublished: h.status === 'published',
    helpfulYes: h.yes,
    helpfulNo: h.no,
    sort: i + 1,
    createdAt: toIso(now - 60 * DAY),
    updatedAt: toIso(now - 10 * DAY),
  }));
}

function tacRows(state: DemoState): TacEntry[] {
  return demoRows<DemoTac>(state, 'tac').map((t, i) => ({
    id: i + 1,
    tac: t.tac,
    brand: t.brand,
    model: t.code,
    marketingName: t.model,
    releaseYear: t.year,
    source: 'import',
  }));
}

/** The stores for a fresh demo state. */
export function buildStores(state: DemoState): Stores {
  const now = Date.now();
  const { services, retail, listings, sales } = listingStores(state, now);
  return {
    listings,
    services,
    retail,
    sales,
    pages: new Collection(pageRows(state)),
    help: new Collection(helpRows(state, now)),
    legal: new Collection(legalRows(state, now)),
    tac: new Collection(tacRows(state)),
  };
}
