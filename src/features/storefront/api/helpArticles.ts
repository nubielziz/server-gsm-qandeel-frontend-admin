// The help centre articles (`/admin/help-articles*`): the Help centre tab of the Storefront page. Ports `tabHelp` and
// `setHelpStatus` (50-p-storefront.js, 12-state-b2c.js) and adds the create and edit the map gives. The map gives no
// bodies (MISMATCHES M10), so shapes are assumed contracts.
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
import type { CreateArticleBody, HelpArticle, UpdateArticleBody } from '../types';

/**
 * The help articles, one page of them. Filters: `q`, `isPublished`, `category` and `locale`; sort with `_sort`/`_order` on
 * `sort`, `question`, `category` or `isPublished`.
 * @route GET /admin/help-articles
 */
export function listHelpArticles(query: ListQuery = {}, init?: ApiInit): Promise<ListResult<HelpArticle>> {
  return apiList<HelpArticle>('/admin/help-articles', query, undefined, init);
}

/**
 * One article with its Markdown answer.
 * Assumed contract: same fields as a list row.
 * @route GET /admin/help-articles/:id
 */
export function getHelpArticle(id: Id, init?: ApiInit): Promise<HelpArticle> {
  return apiGet<HelpArticle>(pathOf('/admin/help-articles/:id', { id }), undefined, init);
}

/**
 * Writes a new article.
 * Assumed contract: body `{ category, question, answerMd, locale, isPublished? }`, answer the new article.
 * @route POST /admin/help-articles
 */
export function createHelpArticle(body: CreateArticleBody, init?: ApiInit): Promise<HelpArticle> {
  return apiPost<HelpArticle>('/admin/help-articles', body, init);
}

/**
 * Changes an article; only the fields that change are sent. The publish switch sends just `isPublished` (there is no
 * publish route for articles).
 * Assumed contract: body is any of the fields of `UpdateArticleBody`, answer the updated article.
 * @route PATCH /admin/help-articles/:id
 */
export function updateHelpArticle(id: Id, body: UpdateArticleBody, init?: ApiInit): Promise<HelpArticle> {
  return apiPatch<HelpArticle>(pathOf('/admin/help-articles/:id', { id }), body, init);
}
