// Types of the Landing pages and Content tabs: a content page as `GET /admin/content-pages` sends it, the bodies of the
// page endpoints and of the draft generator. The map gives the table (`content_pages`) but no bodies, so the shapes beyond
// the generated row are assumed contracts (listed in HANDOFF.md).
import type { ContentPageRow } from '@/lib/api/schema.gen';

/** The landing page kinds of the demo (`LP_KINDS`): one page per carrier, phone model, free tool, brand or country. */
export const LANDING_KINDS = ['carrier', 'model', 'tool', 'brand', 'country'] as const;
export type LandingKind = (typeof LANDING_KINDS)[number];

/** The kinds of the Content tab: the About, contact and how-it-works pages, and the blog. */
export const CONTENT_KINDS = ['static', 'blog'] as const;
export type ContentKind = (typeof CONTENT_KINDS)[number];

export type PageKind = LandingKind | ContentKind;

/** `noindex` is a live page kept out of search results (the demo's "Hidden from Google"). */
export type PageStatus = 'draft' | 'published' | 'noindex';

/**
 * One page (assumed contract). `visits30d` and `orders30d` are the landing-page figures of the last 30 days, `null`
 * when the server has none for the page.
 */
export type ContentPage = Pick<
  ContentPageRow,
  | 'id'
  | 'slug'
  | 'locale'
  | 'title'
  | 'bodyMd'
  | 'seoTitle'
  | 'seoDescription'
  | 'publishedAt'
  | 'createdAt'
  | 'updatedAt'
> & {
  kind: PageKind;
  status: PageStatus;
  visits30d: number | null;
  orders30d: number | null;
};

/** Body of `POST /admin/content-pages` (assumed contract). Without a `slug` the server makes one from the title. */
export type CreatePageBody = {
  kind: PageKind;
  title: string;
  locale: string;
  slug?: string;
  bodyMd: string;
  seoTitle?: string;
  seoDescription?: string;
};

/** Body of `PATCH /admin/content-pages/:id` (assumed contract): only the fields that change; the kind is fixed. */
export type UpdatePageBody = Partial<Omit<CreatePageBody, 'kind'>>;

/** Body of `POST /admin/content-pages/:id/publish` (assumed contract): `true` publishes, `false` hides the page. */
export type PublishPageBody = { published: boolean };

/**
 * Body of `POST /admin/content-pages/generate` (assumed contract): the lists to combine, brand by model by network.
 * An empty list means "all the catalogue knows" for that part.
 */
export type GeneratePagesBody = {
  brands: string[];
  models: string[];
  networks: string[];
};

/** What the generator answers (assumed contract): the drafts it created and how many combinations already had a page. */
export type GeneratePagesResult = {
  created: ContentPage[];
  skipped: number;
};

/** What `GET /admin/content-pages` filters by: `q`, a `kind` (one or several), `status` and `locale`. */
export type PageListFilters = {
  q?: string;
  kind?: PageKind | PageKind[];
  status?: PageStatus;
  locale?: string;
};
