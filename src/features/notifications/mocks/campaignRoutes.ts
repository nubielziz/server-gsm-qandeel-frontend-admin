// Mock routes of the notification campaigns (`/admin/notification-campaigns*`): the list, a campaign, create, edit, delete, the live count, the preview, the
// test, send, schedule, cancel and the recipients. They fake the answers and keep state in the store, and they refuse what the server refuses (permissions,
// the status transitions, the field rules, the confirm number); the real server decides everything (decision 014).
import { http, HttpResponse, type HttpHandler } from 'msw';
import { applyListQuery } from '@/mocks/crud';
import { bodyOf, invalid, notFound } from '@/mocks/handlers/accessShared';
import { latency } from '@/mocks/latency';
import { problem } from '@/mocks/problem';
import { currentStaff } from '@/mocks/session';
import { pushMockStreamEvent } from '@/mocks/stream';
import {
  CAMPAIGN_CHANNELS,
  CAMPAIGN_PURPOSES,
  type CampaignChannel,
  type CampaignDetail,
  type CampaignInput,
} from '../types';
import { previewOf } from './audience';
import { denied } from './access';
import { advance, detailOf, notificationsState, rowOf } from './store';
import { audienceProblems, inputProblems } from './validate';

const LIST_HEADERS = (total: number) => ({
  'x-total-count': String(total),
  'access-control-expose-headers': 'x-total-count',
});
const MINUTE = 60_000;
const MAX_AHEAD = 90 * 24 * 60 * MINUTE;
const SAMPLE_NAME = 'Daniel';

const notNow = (campaign: CampaignDetail, what: string) =>
  problem(409, 'INVALID_TRANSITION', 'Not possible now', `A ${campaign.status} campaign cannot be ${what}.`);

/** Runs a route body with the permission check, the delay and the moving clock; `campaign` is the one in the path, when the route has one. */
function route(
  permission: string,
  run: (context: {
    request: Request;
    id: number;
    campaign: CampaignDetail | undefined;
  }) => Response | Promise<Response>,
  options: { needsCampaign?: boolean } = { needsCampaign: true },
): Parameters<typeof http.get>[1] {
  return async ({ request, params }) => {
    const refused = await denied(request, permission);
    if (refused) return refused;
    await latency();
    const store = notificationsState();
    advance(store);
    const id = Number(params.id);
    const campaign = store.campaigns.find(id);
    if (options.needsCampaign && !campaign) return notFound('campaign', params.id);
    return run({ request, id, campaign: campaign ? detailOf(store, campaign) : undefined });
  };
}

function inputOf(body: Record<string, unknown>): CampaignInput {
  return {
    name: String(body.name ?? ''),
    purpose: CAMPAIGN_PURPOSES.find((p) => p === body.purpose) ?? 'service',
    channels: Array.isArray(body.channels) ? (body.channels as CampaignChannel[]) : [],
    audience: (body.audience ?? {}) as CampaignInput['audience'],
    content: (body.content ?? { title: '', body: '' }) as CampaignInput['content'],
    link: (body.link ?? null) as CampaignInput['link'],
  };
}

const staffRef = async () => {
  const staff = await currentStaff();
  return { id: staff?.id ?? 1, name: staff?.name ?? 'Rami K.' };
};

function reachableNow(campaign: CampaignDetail): number {
  return previewOf(campaign.audience, campaign.channels, campaign.purpose).reachable;
}

const nobody = () =>
  invalid([{ field: 'audience', message: 'Nobody can be reached with this audience and these channels.' }]);

export const campaignRoutes: HttpHandler[] = [
  http.get(
    '*/admin/notification-campaigns',
    route(
      'broadcasts:read',
      ({ request }) => {
        const store = notificationsState();
        const params = new URL(request.url).searchParams;
        if (!params.has('_sort')) {
          params.set('_sort', 'createdAt');
          params.set('_order', 'desc');
        }
        const { page, total } = applyListQuery(store.campaigns.list().map(rowOf), params, ['name']);
        return HttpResponse.json(page, { headers: LIST_HEADERS(total) });
      },
      { needsCampaign: false },
    ),
  ),

  http.post(
    '*/admin/notification-campaigns',
    route(
      'broadcasts:send',
      async ({ request }) => {
        const input = inputOf(await bodyOf(request));
        const problems = inputProblems(input);
        if (problems.length > 0) return invalid(problems);
        const store = notificationsState();
        const now = new Date().toISOString();
        const campaign = store.campaigns.insert({
          ...input,
          link: input.link ?? null,
          status: 'draft',
          scheduledAt: null,
          queuedAt: null,
          startedAt: null,
          finishedAt: null,
          cancelledAt: null,
          expectedRecipients: null,
          recipients: 0,
          planned: { inApp: 0, email: 0, telegram: 0 },
          error: null,
          skipped: { optedOut: 0, noTelegram: 0, noAccount: 0 },
          delivery: {
            inApp: { delivered: 0, read: 0 },
            email: { queued: 0, sent: 0, failed: 0 },
            telegram: { queued: 0, sent: 0, failed: 0 },
          },
          createdBy: await staffRef(),
          createdAt: now,
          updatedAt: now,
          updatedBy: null,
          cancelledBy: null,
        });
        return HttpResponse.json(detailOf(store, campaign), { status: 201 });
      },
      { needsCampaign: false },
    ),
  ),

  // Before `/:id`: "audience-preview" is not an id.
  http.post(
    '*/admin/notification-campaigns/audience-preview',
    route(
      'broadcasts:read',
      async ({ request }) => {
        const body = await bodyOf(request);
        const channels = (Array.isArray(body.channels) ? body.channels : []) as CampaignChannel[];
        const audience = (body.audience ?? {}) as CampaignInput['audience'];
        const purpose = CAMPAIGN_PURPOSES.find((p) => p === body.purpose);
        const problems = [
          ...(channels.length === 0 ? [{ field: 'channels', message: 'Choose at least one channel.' }] : []),
          ...(purpose ? [] : [{ field: 'purpose', message: 'Choose a purpose.' }]),
          ...audienceProblems(audience, channels),
        ];
        if (problems.length > 0 || !purpose) return invalid(problems);
        return HttpResponse.json(previewOf(audience, channels, purpose));
      },
      { needsCampaign: false },
    ),
  ),

  http.get(
    '*/admin/notification-campaigns/:id',
    route('broadcasts:read', ({ campaign }) => HttpResponse.json(campaign)),
  ),

  http.patch(
    '*/admin/notification-campaigns/:id',
    route('broadcasts:send', async ({ request, id, campaign }) => {
      if (!campaign) return notFound('campaign', id);
      if (campaign.status !== 'draft' && campaign.status !== 'scheduled') return notNow(campaign, 'edited');
      const body = await bodyOf(request);
      if (Object.keys(body).length === 0) return invalid([{ message: 'Send at least one field.' }]);
      const merged = {
        ...inputOf({ ...campaign, ...body, link: 'link' in body ? body.link : campaign.link }),
      };
      const problems = inputProblems(merged);
      if (problems.length > 0) return invalid(problems);
      const store = notificationsState();
      const changed = store.campaigns.patch(id, {
        ...merged,
        link: merged.link ?? null,
        expectedRecipients: campaign.status === 'scheduled' ? reachableNow({ ...campaign, ...merged }) : null,
        updatedAt: new Date().toISOString(),
        updatedBy: await staffRef(),
      });
      return HttpResponse.json(detailOf(store, changed as CampaignDetail));
    }),
  ),

  http.delete(
    '*/admin/notification-campaigns/:id',
    route('broadcasts:send', ({ id, campaign }) => {
      if (!campaign) return notFound('campaign', id);
      if (campaign.status !== 'draft') {
        return problem(
          409,
          'NOT_A_DRAFT',
          'Not a draft',
          `Only a draft can be deleted; this campaign is ${campaign.status}. Cancel it instead.`,
        );
      }
      notificationsState().campaigns.remove(id);
      return new HttpResponse(null, { status: 204 });
    }),
  ),

  http.post(
    '*/admin/notification-campaigns/:id/preview',
    route('broadcasts:read', async ({ request, campaign }) => {
      if (!campaign) return notFound('campaign', undefined);
      const body = await bodyOf(request);
      const channel = CAMPAIGN_CHANNELS.find((c) => c === body.channel);
      if (!channel) return invalid([{ field: 'channel', message: 'Choose a channel.' }]);
      const text = campaign.content;
      const fill = (value: string) => value.replaceAll('{{name}}', SAMPLE_NAME);
      const lines = fill(text.body).split('\n');
      return HttpResponse.json({
        subject: fill(text.title),
        body:
          channel === 'email'
            ? `<html><body>${lines.map((line) => `<p>${line}</p>`).join('')}</body></html>`
            : lines.join('\n'),
        format: channel === 'email' ? 'html' : 'text',
        from:
          channel === 'email'
            ? 'GSM Supply <no-reply@gsm-supply.example>'
            : channel === 'telegram'
              ? 'Telegram bot'
              : 'In-app notification',
        note: 'A sample with made-up details.',
      });
    }),
  ),

  http.post(
    '*/admin/notification-campaigns/:id/test',
    route('broadcasts:send', async ({ request, campaign }) => {
      if (!campaign) return notFound('campaign', undefined);
      if (campaign.status !== 'draft' && campaign.status !== 'scheduled') return notNow(campaign, 'tested');
      const body = await bodyOf(request);
      const queued = (Array.isArray(body.channels) ? body.channels : ['in_app', 'email']) as (
        'in_app' | 'email'
      )[];
      if (queued.length === 0 || queued.some((c) => c !== 'in_app' && c !== 'email')) {
        return invalid([{ field: 'channels', message: 'Choose in-app, email or both.' }]);
      }
      if (queued.includes('in_app')) {
        const text = campaign.content;
        const store = notificationsState();
        const item = store.inbox.insert({
          category: campaign.purpose === 'marketing' ? 'marketing' : 'announcement',
          title: text.title,
          body: text.body.replaceAll('{{name}}', SAMPLE_NAME),
          link: null,
          readAt: null,
          createdAt: new Date().toISOString(),
          campaignId: campaign.id,
          event: null,
        });
        // The real server rings the test's recipient (this staff member) the moment the item is made.
        const unread = store.inbox.list().filter((row) => row.readAt === null).length;
        pushMockStreamEvent(
          'notification.created',
          { item, unread: Math.min(100, unread), live: true },
          `i${item.id}`,
        );
      }
      return HttpResponse.json({ queued }, { status: 202 });
    }),
  ),

  http.post(
    '*/admin/notification-campaigns/:id/send',
    route('broadcasts:send', async ({ request, id, campaign }) => {
      if (!campaign) return notFound('campaign', id);
      const confirm = (await bodyOf(request)).confirmRecipients;
      if (typeof confirm !== 'number' || !Number.isInteger(confirm) || confirm < 1) {
        return invalid([{ field: 'confirmRecipients', message: 'Send the number of people you confirmed.' }]);
      }
      if (campaign.status !== 'draft' && campaign.status !== 'scheduled') return notNow(campaign, 'sent');
      const reachable = reachableNow(campaign);
      if (reachable === 0) return nobody();
      if (Math.abs(reachable - confirm) > Math.max(5, Math.ceil(confirm * 0.02))) {
        return problem(
          409,
          'CONFLICT',
          'The audience changed',
          `The audience now reaches ${reachable} people, not ${confirm}. Check the count and send again.`,
        );
      }
      const now = new Date().toISOString();
      const store = notificationsState();
      const changed = store.campaigns.patch(id, {
        status: 'queued',
        queuedAt: now,
        scheduledAt: null,
        expectedRecipients: reachable,
        updatedAt: now,
        updatedBy: await staffRef(),
      });
      return HttpResponse.json(detailOf(store, changed as CampaignDetail), { status: 202 });
    }),
  ),

  http.post(
    '*/admin/notification-campaigns/:id/schedule',
    route('broadcasts:send', async ({ request, id, campaign }) => {
      if (!campaign) return notFound('campaign', id);
      const value = (await bodyOf(request)).scheduledAt;
      const at = typeof value === 'string' ? Date.parse(value) : Number.NaN;
      if (Number.isNaN(at)) return invalid([{ field: 'scheduledAt', message: 'Choose a date and time.' }]);
      if (campaign.status !== 'draft' && campaign.status !== 'scheduled')
        return notNow(campaign, 'scheduled');
      const ahead = at - Date.now();
      if (ahead < MINUTE)
        return invalid([{ field: 'scheduledAt', message: 'Choose a time at least one minute from now.' }]);
      if (ahead > MAX_AHEAD)
        return invalid([{ field: 'scheduledAt', message: 'Choose a time at most 90 days from now.' }]);
      const reachable = reachableNow(campaign);
      if (reachable === 0) return nobody();
      const store = notificationsState();
      const changed = store.campaigns.patch(id, {
        status: 'scheduled',
        scheduledAt: new Date(at).toISOString(),
        expectedRecipients: reachable,
        updatedAt: new Date().toISOString(),
        updatedBy: await staffRef(),
      });
      return HttpResponse.json(detailOf(store, changed as CampaignDetail));
    }),
  ),

  http.post(
    '*/admin/notification-campaigns/:id/cancel',
    route('broadcasts:send', async ({ id, campaign }) => {
      if (!campaign) return notFound('campaign', id);
      if (!['scheduled', 'queued', 'sending'].includes(campaign.status)) {
        return problem(
          409,
          'INVALID_TRANSITION',
          'Not possible now',
          campaign.status === 'draft'
            ? 'A draft is deleted, not cancelled.'
            : `A ${campaign.status} campaign cannot be cancelled.`,
        );
      }
      const store = notificationsState();
      // Messages not yet sent fail with the reason the server logs.
      store.rows.set(
        id,
        (store.rows.get(id) ?? []).map((row) =>
          row.status === 'queued'
            ? { ...row, status: 'failed' as const, error: 'The campaign was cancelled.' }
            : row,
        ),
      );
      const now = new Date().toISOString();
      const changed = store.campaigns.patch(id, {
        status: 'cancelled',
        cancelledAt: now,
        cancelledBy: await staffRef(),
        updatedAt: now,
      });
      return HttpResponse.json(detailOf(store, changed as CampaignDetail));
    }),
  ),

  http.get(
    '*/admin/notification-campaigns/:id/recipients',
    route('broadcasts:read', ({ request, id }) => {
      const params = new URL(request.url).searchParams;
      if (!CAMPAIGN_CHANNELS.some((channel) => channel === params.get('channel'))) {
        return invalid([{ field: 'channel', message: 'Choose a channel: in_app, email or telegram.' }]);
      }
      const rows = notificationsState().rows.get(id) ?? [];
      const { page, total } = applyListQuery(rows, params);
      return HttpResponse.json(page, { headers: LIST_HEADERS(total) });
    }),
  ),
];
