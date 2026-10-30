// Mock of the help article routes (`/admin/help-articles` and `/admin/help-articles/:id`): list with the search and publish
// filters, one article, write and change. The mock checks the fields a form needs and answers like the real server would.
import { http, HttpResponse, type HttpHandler } from 'msw';
import { toIso } from '@/mocks/seed';
import type { HelpArticle } from '../types';
import { bodyOf, invalid, listAnswer, LOCALES, notFound, rawTextOf, signedIn, textOf } from './http';
import { storefrontStore } from './store';

const SEARCH_FIELDS = ['question', 'category'];

/** The help article routes. */
export const helpRoutes: HttpHandler[] = [
  http.get('*/admin/help-articles', ({ request }) =>
    signedIn(request, async () => listAnswer((await storefrontStore()).help.list(), request, SEARCH_FIELDS)),
  ),

  http.get('*/admin/help-articles/:id', ({ request, params }) =>
    signedIn(request, async () => {
      const article = (await storefrontStore()).help.find(String(params.id));
      return article ? HttpResponse.json(article) : notFound('article', params.id);
    }),
  ),

  http.post('*/admin/help-articles', ({ request }) =>
    signedIn(request, async () => {
      const stores = await storefrontStore();
      const body = await bodyOf(request);
      const category = textOf(body.category);
      const question = textOf(body.question);
      const answerMd = rawTextOf(body.answerMd);
      const locale = textOf(body.locale) || 'en';
      const errors = [];
      if (!category) errors.push({ field: 'category', message: 'Enter a topic.' });
      if (!question) errors.push({ field: 'question', message: 'Enter the question.' });
      if (!answerMd.trim()) errors.push({ field: 'answerMd', message: 'Enter the answer.' });
      if (!LOCALES.includes(locale)) errors.push({ field: 'locale', message: 'Choose a language.' });
      if (errors.length > 0) return invalid(errors);
      const now = toIso(Date.now());
      const article = stores.help.insert({
        category,
        question,
        answerMd,
        locale,
        isPublished: body.isPublished === true,
        helpfulYes: 0,
        helpfulNo: 0,
        sort: stores.help.size + 1,
        createdAt: now,
        updatedAt: now,
      });
      return HttpResponse.json(article, { status: 201 });
    }),
  ),

  http.patch('*/admin/help-articles/:id', ({ request, params }) =>
    signedIn(request, async () => {
      const stores = await storefrontStore();
      const article = stores.help.find(String(params.id));
      if (!article) return notFound('article', params.id);
      const body = await bodyOf(request);
      const changes: Partial<HelpArticle> = {};
      if ('category' in body) changes.category = textOf(body.category);
      if ('question' in body) changes.question = textOf(body.question);
      if ('answerMd' in body) changes.answerMd = rawTextOf(body.answerMd);
      if ('locale' in body) changes.locale = textOf(body.locale);
      if ('isPublished' in body && typeof body.isPublished === 'boolean')
        changes.isPublished = body.isPublished;
      const empty = (['category', 'question', 'answerMd'] as const).find(
        (field) => field in changes && !changes[field]?.trim(),
      );
      if (empty) return invalid([{ field: empty, message: 'This field cannot be empty.' }]);
      return HttpResponse.json(stores.help.patch(article.id, { ...changes, updatedAt: toIso(Date.now()) }));
    }),
  ),
];
