// Mock of the notification template routes (`/admin/notification-templates*`) and the preview. The preview fills `{{name}}` marks with
// sample data and answers plain text; a test that needs HTML answers the route itself. The mock stops a second template for the same
// event, channel, audience and language.
import { http, HttpResponse, type HttpHandler } from 'msw';
import type { ProblemError } from '@/mocks/problem';
import type { NotificationAudience, NotificationChannel, NotificationTemplate } from '../types';
import { bodyOf, invalid, listAnswer, notFound, signedIn, textOf } from './http';
import { settingsFeatureStore } from './store';

const CHANNELS: NotificationChannel[] = ['email', 'telegram'];
const AUDIENCES: NotificationAudience[] = ['customer', 'merchant', 'staff'];

// The sample order the preview talks about, the one the demo's NOTIF_SAMPLE uses.
const SAMPLE: Record<string, string> = {
  customerName: 'Daniel',
  orderId: 'SF-20431',
  amount: '£14.39',
  service: 'Vodafone UK iPhone Unlock',
  device: 'iPhone 13',
};

/** Replaces each `{{name}}` with its sample value; an unknown name stays as it is, so a typo is visible. */
function fill(text: string): string {
  return text.replace(/\{\{(\w+)\}\}/g, (mark, name: string) => SAMPLE[name] ?? mark);
}

/** Applies the fields of a body to a template, collecting the problems. */
function applyFields(
  row: Omit<NotificationTemplate, 'id'>,
  body: Record<string, unknown>,
  problems: ProblemError[],
) {
  const draft = { ...row };
  if ('event' in body) {
    draft.event = textOf(body.event) ?? '';
    if (!/^[a-z]+(\.[a-z_]+)+$/.test(draft.event))
      problems.push({ field: 'event', message: 'Use the event key, such as order.completed.' });
  }
  if ('channel' in body) {
    if (CHANNELS.includes(body.channel as NotificationChannel))
      draft.channel = body.channel as NotificationChannel;
    else problems.push({ field: 'channel', message: 'Choose email or Telegram.' });
  }
  if ('audience' in body) {
    if (AUDIENCES.includes(body.audience as NotificationAudience))
      draft.audience = body.audience as NotificationAudience;
    else problems.push({ field: 'audience', message: 'Choose who receives it.' });
  }
  if ('locale' in body) {
    draft.locale = textOf(body.locale) ?? '';
    if (!/^[a-z]{2}(-[A-Z]{2})?$/.test(draft.locale))
      problems.push({ field: 'locale', message: 'Use a language code such as en.' });
  }
  if ('subject' in body) draft.subject = textOf(body.subject) ?? '';
  if ('body' in body) {
    draft.body = typeof body.body === 'string' ? body.body : '';
    if (!draft.body.trim()) problems.push({ field: 'body', message: 'Write the message.' });
  }
  if (draft.channel === 'email' && !draft.subject)
    problems.push({ field: 'subject', message: 'An email needs a subject.' });
  if ('isActive' in body) draft.isActive = body.isActive === true;
  return draft;
}

/** The template routes. The preview is a POST on `/:id/preview`, which no other handler of that method matches. */
export const templateRoutes: HttpHandler[] = [
  http.post('*/admin/notification-templates/:id/preview', ({ request, params }) =>
    signedIn(request, async () => {
      const row = (await settingsFeatureStore()).templates.find(String(params.id));
      if (!row) return notFound('template', params.id);
      const body = await bodyOf(request);
      const subject = typeof body.subject === 'string' ? body.subject : row.subject;
      const text = typeof body.body === 'string' ? body.body : row.body;
      return HttpResponse.json({
        subject: fill(subject),
        body: fill(text),
        format: 'text',
        from: 'GSM Supply <support@gsmsupply.example>',
        note: 'A sample with made-up details.',
      });
    }),
  ),

  http.get('*/admin/notification-templates', ({ request }) =>
    signedIn(request, async () =>
      listAnswer((await settingsFeatureStore()).templates.list(), request, ['event', 'subject']),
    ),
  ),

  http.get('*/admin/notification-templates/:id', ({ request, params }) =>
    signedIn(request, async () => {
      const row = (await settingsFeatureStore()).templates.find(String(params.id));
      return row ? HttpResponse.json(row) : notFound('template', params.id);
    }),
  ),

  http.post('*/admin/notification-templates', ({ request }) =>
    signedIn(request, async () => {
      const { templates } = await settingsFeatureStore();
      const body = await bodyOf(request);
      const problems: ProblemError[] = [];
      const blank: Omit<NotificationTemplate, 'id'> = {
        event: '',
        channel: 'email',
        audience: 'customer',
        locale: 'en',
        subject: '',
        body: '',
        isActive: true,
        sentLast30Days: 0,
        createdAt: new Date().toISOString(),
      };
      const draft = applyFields(blank, body, problems);
      for (const key of ['event', 'body'] as const)
        if (!(key in body)) problems.push({ field: key, message: 'This field is required.' });
      const twin = templates
        .list()
        .some((row) =>
          (['event', 'channel', 'audience', 'locale'] as const).every((key) => row[key] === draft[key]),
        );
      if (twin && problems.length === 0)
        problems.push({
          field: 'event',
          message: 'A template for this event, channel and language already exists.',
        });
      return problems.length > 0
        ? invalid(problems)
        : HttpResponse.json(templates.insert(draft), { status: 201 });
    }),
  ),

  http.patch('*/admin/notification-templates/:id', ({ request, params }) =>
    signedIn(request, async () => {
      const { templates } = await settingsFeatureStore();
      const row = templates.find(String(params.id));
      if (!row) return notFound('template', params.id);
      const problems: ProblemError[] = [];
      const draft = applyFields(row, await bodyOf(request), problems);
      return problems.length > 0
        ? invalid(problems)
        : HttpResponse.json(templates.patch(row.id, draft) ?? row);
    }),
  ),

  http.delete('*/admin/notification-templates/:id', ({ request, params }) =>
    signedIn(request, async () => {
      const { templates } = await settingsFeatureStore();
      const row = templates.find(String(params.id));
      if (!row) return notFound('template', params.id);
      templates.remove(row.id);
      return new HttpResponse(null, { status: 204 });
    }),
  ),
];
