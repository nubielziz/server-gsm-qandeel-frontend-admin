// Mock of the content page routes (`/admin/content-pages*`): list with the kind, status and search filters, one page, create (a
// draft), change, publish or hide, and the draft generator. The mock plays the server: slugs are unique per language, a new page is
// a draft, and the generator skips a combination that already has a page.
import { http, HttpResponse, type HttpHandler } from 'msw';
import { toIso } from '@/mocks/seed';
import { CONTENT_KINDS, LANDING_KINDS, type ContentPage, type PageKind } from '../types';
import {
  bodyOf,
  conflict,
  invalid,
  listAnswer,
  LOCALES,
  notFound,
  rawTextOf,
  signedIn,
  slugOf,
  textOf,
} from './http';
import { storefrontStore } from './store';
import type { Stores } from './types';

const SEARCH_FIELDS = ['title', 'slug'];
const KINDS: readonly string[] = [...LANDING_KINDS, ...CONTENT_KINDS];
/** The networks the generator uses when none are given. */
const DEFAULT_NETWORKS = ['AT&T', 'T-Mobile', 'Vodafone'];
/** The most drafts one generator run makes: "a handful". */
const GENERATE_CAP = 6;

/** The page with this slug in this language, other than `exceptId`. */
function slugTaken(stores: Stores, slug: string, locale: string, exceptId?: number): ContentPage | undefined {
  return stores.pages
    .list()
    .find((page) => page.slug === slug && page.locale === locale && page.id !== exceptId);
}

function slugConflict(slug: string) {
  const message = `The slug ${slug} is already used by another page.`;
  return conflict('SLUG_TAKEN', 'Slug already used', message, [{ field: 'slug', message }]);
}

/** A new draft page. */
function draftPage(
  stores: Stores,
  fields: Pick<ContentPage, 'kind' | 'title' | 'slug' | 'locale'> & Partial<ContentPage>,
) {
  const now = toIso(Date.now());
  return stores.pages.insert({
    bodyMd: '',
    seoTitle: '',
    seoDescription: '',
    status: 'draft',
    publishedAt: null,
    createdAt: now,
    updatedAt: now,
    visits30d: null,
    orders30d: null,
    ...fields,
  });
}

/** The page routes. `generate` comes before `:id` routes of the same method only matter for GET, which it has none of. */
export const pageRoutes: HttpHandler[] = [
  http.post('*/admin/content-pages/generate', ({ request }) =>
    signedIn(request, async () => {
      const stores = await storefrontStore();
      const body = await bodyOf(request);
      const list = (value: unknown) => (Array.isArray(value) ? value.map(textOf).filter(Boolean) : []);
      const tac = stores.tac.list();
      const brands = list(body.brands).length > 0 ? list(body.brands) : [...new Set(tac.map((t) => t.brand))];
      const wantedModels = list(body.models);
      const models = tac
        .filter((t) => brands.includes(t.brand))
        .map((t) => t.marketingName || t.model)
        .filter((name) => wantedModels.length === 0 || wantedModels.includes(name));
      // A model that is not in the catalogue is still generated when it was typed by hand.
      const allModels = [...new Set([...models, ...wantedModels])];
      const networks = list(body.networks).length > 0 ? list(body.networks) : DEFAULT_NETWORKS;
      const created: ContentPage[] = [];
      let skipped = 0;
      for (const model of allModels) {
        for (const network of networks) {
          const title = `Unlock ${model} on ${network}`;
          const slug = slugOf(title);
          if (slugTaken(stores, slug, 'en')) skipped += 1;
          else if (created.length < GENERATE_CAP) {
            created.push(
              draftPage(stores, {
                kind: 'model',
                title,
                slug,
                locale: 'en',
                bodyMd: `# ${title}\n\nDraft for review.`,
              }),
            );
          }
        }
      }
      return HttpResponse.json({ created, skipped });
    }),
  ),

  http.post('*/admin/content-pages/:id/publish', ({ request, params }) =>
    signedIn(request, async () => {
      const stores = await storefrontStore();
      const page = stores.pages.find(String(params.id));
      if (!page) return notFound('page', params.id);
      const body = await bodyOf(request);
      if (typeof body.published !== 'boolean') {
        return invalid([{ field: 'published', message: 'Say whether to publish or hide the page.' }]);
      }
      const now = toIso(Date.now());
      const changes: Partial<ContentPage> = body.published
        ? { status: 'published', publishedAt: now, updatedAt: now }
        : { status: 'draft', updatedAt: now };
      return HttpResponse.json(stores.pages.patch(page.id, changes));
    }),
  ),

  http.get('*/admin/content-pages', ({ request }) =>
    signedIn(request, async () => listAnswer((await storefrontStore()).pages.list(), request, SEARCH_FIELDS)),
  ),

  http.get('*/admin/content-pages/:id', ({ request, params }) =>
    signedIn(request, async () => {
      const page = (await storefrontStore()).pages.find(String(params.id));
      return page ? HttpResponse.json(page) : notFound('page', params.id);
    }),
  ),

  http.post('*/admin/content-pages', ({ request }) =>
    signedIn(request, async () => {
      const stores = await storefrontStore();
      const body = await bodyOf(request);
      const title = textOf(body.title);
      const kind = textOf(body.kind);
      const locale = textOf(body.locale) || 'en';
      const errors = [];
      if (!KINDS.includes(kind)) errors.push({ field: 'kind', message: 'Choose a type.' });
      if (!title) errors.push({ field: 'title', message: 'Enter a title.' });
      if (!LOCALES.includes(locale)) errors.push({ field: 'locale', message: 'Choose a language.' });
      if (errors.length > 0) return invalid(errors);
      const slug = textOf(body.slug) || slugOf(title);
      if (slugTaken(stores, slug, locale)) return slugConflict(slug);
      const page = draftPage(stores, {
        kind: kind as PageKind,
        title,
        slug,
        locale,
        bodyMd: rawTextOf(body.bodyMd),
        seoTitle: textOf(body.seoTitle),
        seoDescription: textOf(body.seoDescription),
      });
      return HttpResponse.json(page, { status: 201 });
    }),
  ),

  http.patch('*/admin/content-pages/:id', ({ request, params }) =>
    signedIn(request, async () => {
      const stores = await storefrontStore();
      const page = stores.pages.find(String(params.id));
      if (!page) return notFound('page', params.id);
      const body = await bodyOf(request);
      const changes: Partial<ContentPage> = {};
      if ('title' in body) {
        changes.title = textOf(body.title);
        if (!changes.title) return invalid([{ field: 'title', message: 'Enter a title.' }]);
      }
      if ('slug' in body) changes.slug = textOf(body.slug);
      if ('locale' in body) changes.locale = textOf(body.locale);
      if ('bodyMd' in body) changes.bodyMd = rawTextOf(body.bodyMd);
      if ('seoTitle' in body) changes.seoTitle = textOf(body.seoTitle);
      if ('seoDescription' in body) changes.seoDescription = textOf(body.seoDescription);
      if (
        changes.slug !== undefined &&
        (!changes.slug || slugTaken(stores, changes.slug, changes.locale ?? page.locale, page.id))
      ) {
        return changes.slug
          ? slugConflict(changes.slug)
          : invalid([{ field: 'slug', message: 'Enter a slug.' }]);
      }
      return HttpResponse.json(stores.pages.patch(page.id, { ...changes, updatedAt: toIso(Date.now()) }));
    }),
  ),
];
