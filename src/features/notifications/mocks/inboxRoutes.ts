// Mock routes of the staff member's inbox (`/admin/inbox*`): the list, the unread count (capped at 100), mark one read and mark all read. They need a session
// only. The mock keeps one inbox for whoever is signed in (the real server keeps one per staff member).
import { http, HttpResponse, type HttpHandler } from 'msw';
import { applyListQuery } from '@/mocks/crud';
import { bodyOf, invalid, notFound } from '@/mocks/handlers/accessShared';
import { latency } from '@/mocks/latency';
import { pushMockStreamEvent } from '@/mocks/stream';
import { denied } from './access';
import { notificationsState } from './store';

const CAP = 100;

/** The unread count as the server sends it: capped at 100. */
function unreadNow(): number {
  return Math.min(
    CAP,
    notificationsState()
      .inbox.list()
      .filter((item) => item.readAt === null).length,
  );
}

/** A route body behind the session check and the delay. */
function session(
  run: (context: { request: Request; id: number }) => Response | Promise<Response>,
): Parameters<typeof http.get>[1] {
  return async ({ request, params }) => {
    const refused = await denied(request);
    if (refused) return refused;
    await latency();
    return run({ request, id: Number(params.id) });
  };
}

export const inboxRoutes: HttpHandler[] = [
  http.get(
    '*/admin/inbox/unread-count',
    session(() => HttpResponse.json({ unread: unreadNow() })),
  ),

  http.get(
    '*/admin/inbox',
    session(({ request }) => {
      const params = new URL(request.url).searchParams;
      const unread = params.get('unread');
      // `unread` and `locale` are not fields of an item: read them here, then let the generic list code do the paging.
      params.delete('unread');
      params.delete('locale');
      if (!params.has('_sort')) {
        params.set('_sort', 'createdAt,id');
        params.set('_order', 'desc,desc');
      }
      const items = notificationsState()
        .inbox.list()
        .filter((item) =>
          unread === 'true' ? item.readAt === null : unread === 'false' ? item.readAt !== null : true,
        );
      const { page, total } = applyListQuery(items, params);
      return HttpResponse.json(page, {
        headers: { 'x-total-count': String(total), 'access-control-expose-headers': 'x-total-count' },
      });
    }),
  ),

  http.post(
    '*/admin/inbox/read-all',
    session(async ({ request }) => {
      const body = await bodyOf(request);
      const upTo = body.upToId;
      if (upTo !== undefined && (typeof upTo !== 'number' || !Number.isInteger(upTo) || upTo < 1)) {
        return invalid([{ field: 'upToId', message: 'Send the id of the newest notification you saw.' }]);
      }
      const now = new Date().toISOString();
      let updated = 0;
      for (const item of notificationsState().inbox.list()) {
        if (item.readAt === null && (upTo === undefined || item.id <= upTo)) {
          notificationsState().inbox.patch(item.id, { readAt: now });
          updated += 1;
        }
      }
      // The real server tells every open stream of this staff member (this tab included) that the items were read.
      if (updated > 0)
        pushMockStreamEvent('notification.read', {
          ids: [],
          all: true,
          upToId: upTo ?? null,
          unread: unreadNow(),
        });
      return HttpResponse.json({ updated });
    }),
  ),

  http.post(
    '*/admin/inbox/:id/read',
    session(({ id }) => {
      const store = notificationsState();
      const item = store.inbox.find(id);
      if (!item) return notFound('notification', id);
      if (item.readAt === null) {
        store.inbox.patch(id, { readAt: new Date().toISOString() });
        pushMockStreamEvent('notification.read', {
          ids: [id],
          all: false,
          upToId: null,
          unread: unreadNow(),
        });
      }
      return new HttpResponse(null, { status: 204 });
    }),
  ),
];
