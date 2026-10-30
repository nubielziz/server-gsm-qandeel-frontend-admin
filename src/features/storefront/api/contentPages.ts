// The content pages (`/admin/content-pages*`): the Landing pages tab and the pages half of the Content and legal tab. Ports
// `tabLanding`, `tabContent`, `setLanding`, `setPageStatus` (50-p-storefront.js, 12-state-b2c.js) and adds the draft generator
// the map gives. The map gives no bodies (MISMATCHES M10), so shapes are assumed contracts.
import {
  apiGet,
  apiList,
  apiPatch,
  apiPost,
  pathOf,
  type ApiInit,
  type Id,
  type ListQuery,
  type ListResult,
} from '@/lib/api';
import type {
  ContentPage,
  CreatePageBody,
  GeneratePagesBody,
  GeneratePagesResult,
  PublishPageBody,
  UpdatePageBody,
} from '../types';

/**
 * The landing, static and blog pages, one page of them. Filters: `q`, `kind` (repeat it for several kinds), `status` and
 * `locale`; sort with `_sort`/`_order` on `title`, `status` or `updatedAt`.
 * Assumed contract: rows carry `kind`, `status` (`draft`, `published`, `noindex`) and, for landing pages, `visits30d` and
 * `orders30d`.
 * @route GET /admin/content-pages
 */
export function listContentPages(query: ListQuery = {}, init?: ApiInit): Promise<ListResult<ContentPage>> {
  return apiList<ContentPage>('/admin/content-pages', query, undefined, init);
}

/**
 * One page with its Markdown body.
 * Assumed contract: same fields as a list row.
 * @route GET /admin/content-pages/:id
 */
export function getContentPage(id: Id, init?: ApiInit): Promise<ContentPage> {
  return apiGet<ContentPage>(pathOf('/admin/content-pages/:id', { id }), undefined, init);
}

/**
 * Creates a page as a draft. Publishing is a separate step with its own permission.
 * Assumed contract: body `{ kind, title, locale, slug?, bodyMd, seoTitle?, seoDescription? }`, answer the new page.
 * @route POST /admin/content-pages
 */
export function createContentPage(body: CreatePageBody, init?: ApiInit): Promise<ContentPage> {
  return apiPost<ContentPage>('/admin/content-pages', body, init);
}

/**
 * Changes some fields of a page; only the fields that change are sent. The status is not changed here: publishing and
 * hiding go through the publish route.
 * Assumed contract: body is any of the fields of `UpdatePageBody`, answer the updated page.
 * @route PATCH /admin/content-pages/:id
 */
export function updateContentPage(id: Id, body: UpdatePageBody, init?: ApiInit): Promise<ContentPage> {
  return apiPatch<ContentPage>(pathOf('/admin/content-pages/:id', { id }), body, init);
}

/**
 * Publishes a page or hides it again (the demo's Publish, Unpublish and `pg-toggle`).
 * Assumed contract: body `{ published: boolean }`, answer the updated page.
 * @route POST /admin/content-pages/:id/publish
 */
export function publishContentPage(id: Id, body: PublishPageBody, init?: ApiInit): Promise<ContentPage> {
  return apiPost<ContentPage>(pathOf('/admin/content-pages/:id/publish', { id }), body, init);
}

/**
 * The landing-page generator: makes a draft for each brand, model and network combination, for a person to review. It
 * publishes nothing.
 * Assumed contract: body `{ brands, models, networks }` (a list left empty means every one the catalogue knows), answer
 * `{ created, skipped }`.
 * @route POST /admin/content-pages/generate
 */
export function generateContentPages(body: GeneratePagesBody, init?: ApiInit): Promise<GeneratePagesResult> {
  return apiPost<GeneratePagesResult>('/admin/content-pages/generate', body, init);
}
