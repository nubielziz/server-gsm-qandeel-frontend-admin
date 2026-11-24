// Mock of the content page routes (`/admin/content-pages*`): list with the kind, status and search filters, one page, create (a
// draft), change, and publish or hide. The mock plays the server: a slug belongs to one page and a new page is a draft. Only the
// static and blog kinds exist; the landing kinds and the draft generator were retired (decision 025).
import { http, HttpResponse, type HttpHandler } from 'msw';
import { toIso } from '@/mocks/seed';
import { CONTENT_KINDS, type ContentPage, type PageKind } from '../types';
import { bodyOf, conflict, invalid, listAnswer, notFound, rawTextOf, signedIn, slugOf, textOf } from './http';
import { storefrontStore } from './store';
import type { Stores } from './types';

const SEARCH_FIELDS = ['title', 'slug'];
const KINDS: readonly string[] = CONTENT_KINDS;

/** The page with this slug, other than `exceptId`. */
function slugTaken(stores: Stores, slug: string, exceptId?: number): ContentPage | undefined {
  return stores.pages.list().find((page) => page.slug === slug && page.id !== exceptId);
}

function slugConflict(slug: string) {
  const message = `The slug ${slug} is already used by another page.`;
  return conflict('SLUG_TAKEN', 'Slug already used', message, [{ field: 'slug', message }]);
}

/** A new draft page. */
function draftPage(
  stores: Stores,
  fields: Pick<ContentPage, 'kind' | 'title' | 'slug'> & Partial<ContentPage>,
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

/** The page routes. */
export const pageRoutes: HttpHandler[] = [
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
      const errors = [];
      if (!KINDS.includes(kind)) errors.push({ field: 'kind', message: 'Choose a type.' });
      if (!title) errors.push({ field: 'title', message: 'Enter a title.' });
      if (errors.length > 0) return invalid(errors);
      const slug = textOf(body.slug) || slugOf(title);
      if (slugTaken(stores, slug)) return slugConflict(slug);
      const page = draftPage(stores, {
        kind: kind as PageKind,
        title,
        slug,
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
      if ('bodyMd' in body) changes.bodyMd = rawTextOf(body.bodyMd);
      if ('seoTitle' in body) changes.seoTitle = textOf(body.seoTitle);
      if ('seoDescription' in body) changes.seoDescription = textOf(body.seoDescription);
      if (changes.slug !== undefined && (!changes.slug || slugTaken(stores, changes.slug, page.id))) {
        return changes.slug
          ? slugConflict(changes.slug)
          : invalid([{ field: 'slug', message: 'Enter a slug.' }]);
      }
      return HttpResponse.json(stores.pages.patch(page.id, { ...changes, updatedAt: toIso(Date.now()) }));
    }),
  ),
];
