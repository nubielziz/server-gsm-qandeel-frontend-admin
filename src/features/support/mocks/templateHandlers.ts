// Mock of `GET /admin/reply-templates`, `GET …/:id`, `POST`, `PATCH …/:id` and `DELETE …/:id`: the template list with filters and sort, and
// the edits. The only refusals are bad input (a title and a text are needed, a shortcut starts with a slash) and a shortcut another
// template already uses. Dev and tests only.
import { http, HttpResponse, type HttpHandler } from 'msw';
import { bodyOf, invalid, notFound, readHandlers, textOf } from '@/mocks/handlers/accessShared';
import { latency } from '@/mocks/latency';
import { problem, type ProblemError } from '@/mocks/problem';
import { currentStaff, guard } from '@/mocks/session';
import { CATEGORY_LABEL } from '../lib/status';
import type { ReplyTemplate, TicketCategory } from '../types';
import { supportState } from './store';
import type { SupportState } from './types';

// Checks the fields of a template body that are present. `partial` is true for a PATCH, where absent fields are not an error.
function templateErrors(body: Record<string, unknown>, partial: boolean): ProblemError[] {
  const errors: ProblemError[] = [];
  const need = (field: string, message: string, present: boolean, ok: boolean) => {
    if (present ? !ok : !partial) errors.push({ field, message });
  };
  need('title', 'Give the template a title.', body.title !== undefined, textOf(body.title).length > 0);
  need('body', 'Write the reply text.', body.body !== undefined, textOf(body.body).length > 0);
  need(
    'category',
    'Choose a category.',
    body.category !== undefined,
    Object.hasOwn(CATEGORY_LABEL, String(body.category)),
  );
  need('locale', 'Choose a language.', body.locale !== undefined, textOf(body.locale).length > 0);
  if (body.shortcut !== undefined && textOf(body.shortcut) !== '' && !textOf(body.shortcut).startsWith('/')) {
    errors.push({ field: 'shortcut', message: 'A shortcut starts with a slash, like /refund.' });
  }
  return errors;
}

// The 409 the real server gives when another template already has the shortcut.
function shortcutOwner(state: SupportState, shortcut: string, exceptId?: number): ReplyTemplate | undefined {
  if (!shortcut) return undefined;
  return state.templates.list().find((other) => other.id !== exceptId && other.shortcut === shortcut);
}

const shortcutTaken = (other: ReplyTemplate, shortcut: string): Response =>
  problem(409, 'SHORTCUT_TAKEN', 'Shortcut already used', `${shortcut} already belongs to “${other.title}”.`);

export const templateHandlers: HttpHandler[] = [
  ...readHandlers<ReplyTemplate, ReplyTemplate>({
    base: '/admin/reply-templates',
    what: 'reply template',
    source: async () => ({ rows: (await supportState()).templates.list(), toDto: (row) => row }),
    searchFields: ['title', 'body', 'shortcut'],
  }),

  http.post('*/admin/reply-templates', async ({ request }) => {
    const denied = guard(request);
    if (denied) return denied;
    await latency();
    const state = await supportState();
    const body = await bodyOf(request);
    const errors = templateErrors(body, false);
    if (errors.length > 0) return invalid(errors);
    const shortcut = textOf(body.shortcut);
    const other = shortcutOwner(state, shortcut);
    if (other) return shortcutTaken(other, shortcut);
    const now = new Date().toISOString();
    const row = state.templates.insert({
      title: textOf(body.title),
      category: body.category as TicketCategory,
      locale: textOf(body.locale),
      body: textOf(body.body),
      shortcut,
      createdBy: (await currentStaff())?.id ?? null,
      createdAt: now,
      updatedAt: now,
    });
    return HttpResponse.json(row, { status: 201 });
  }),

  http.patch('*/admin/reply-templates/:id', async ({ request, params }) => {
    const denied = guard(request);
    if (denied) return denied;
    await latency();
    const state = await supportState();
    const row = state.templates.find(String(params.id));
    if (!row) return notFound('reply template', params.id);
    const body = await bodyOf(request);
    const errors = templateErrors(body, true);
    if (errors.length > 0) return invalid(errors);
    const changes: Partial<ReplyTemplate> = {};
    if (body.title !== undefined) changes.title = textOf(body.title);
    if (body.body !== undefined) changes.body = textOf(body.body);
    if (body.category !== undefined) changes.category = body.category as TicketCategory;
    if (body.locale !== undefined) changes.locale = textOf(body.locale);
    if (body.shortcut !== undefined) {
      const shortcut = textOf(body.shortcut);
      const other = shortcutOwner(state, shortcut, row.id);
      if (other) return shortcutTaken(other, shortcut);
      changes.shortcut = shortcut;
    }
    const saved = state.templates.patch(row.id, { ...changes, updatedAt: new Date().toISOString() });
    return HttpResponse.json(saved);
  }),

  http.delete('*/admin/reply-templates/:id', async ({ request, params }) => {
    const denied = guard(request);
    if (denied) return denied;
    await latency();
    const state = await supportState();
    return state.templates.remove(String(params.id))
      ? new HttpResponse(null, { status: 204 })
      : notFound('reply template', params.id);
  }),
];
