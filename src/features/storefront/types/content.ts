// Types of the Content tab: a content page (a static page or a blog post) as `GET /admin/content-pages` sends it and the bodies
// of the page endpoints. The map gives the table (`content_pages`) but no bodies, so the shapes beyond the generated row are
// assumed contracts (listed in HANDOFF.md). The landing page kinds and the draft generator were retired (decision 025).
import type { ContentPageRow } from '@/lib/api/schema.gen';

/** The kinds of the Content tab: the About, contact and how-it-works pages, and the blog. */
export const CONTENT_KINDS = ['static', 'blog'] as const;
export type ContentKind = (typeof CONTENT_KINDS)[number];

/** The kinds of page the console makes and shows. A row of an old landing kind that an older backend still sends is never listed. */
export type PageKind = ContentKind;

/** `noindex` is a live page kept out of search results (the demo's "Hidden from Google"). */
export type PageStatus = 'draft' | 'published' | 'noindex';

/**
 * One page (assumed contract). `visits30d` and `orders30d` were the landing-page figures of the last 30 days; the console
 * ignores them now (the server sends `null` and the Pages panel has no such column).
 */
export type ContentPage = Pick<
  ContentPageRow,
  | 'id'
  | 'slug'
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
  slug?: string;
  bodyMd: string;
  seoTitle?: string;
  seoDescription?: string;
};

/** Body of `PATCH /admin/content-pages/:id` (assumed contract): only the fields that change; the kind is fixed. */
export type UpdatePageBody = Partial<Omit<CreatePageBody, 'kind'>>;

/** Body of `POST /admin/content-pages/:id/publish` (assumed contract): `true` publishes, `false` hides the page. */
export type PublishPageBody = { published: boolean };

/** What `GET /admin/content-pages` filters by: `q`, a `kind` (one or several) and `status`. */
export type PageListFilters = {
  q?: string;
  kind?: PageKind | PageKind[];
  status?: PageStatus;
};
