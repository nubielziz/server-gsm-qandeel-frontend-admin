// Names and data shapes of the staff member's live stream (`GET /admin/stream`, backend feature 27), the parsers that check them,
// and the dedupe rule. Written from `docs/contract/realtime-events.md` of the backend; the stream is a backend addition (MISMATCHES M261).
import type { Id, IsoDateTime } from '@/lib/api';

// These constants are paths, not fetch functions, so they carry no route tag on purpose: the backend's contract harvest must never call a stream.

/** The staff stream: server-sent events, same origin as the other `/admin/*` calls. */
export const STAFF_STREAM_PATH = '/admin/stream';
/** The plain route the client asks after a failed connect, to learn why (401 or 403: the session is gone; 429: slow down; 200: the stream was refused). */
export const STAFF_PROBE_PATH = '/admin/inbox/unread-count';
/** Name of the Web Lock and the BroadcastChannel that make the tabs of one browser share one stream. */
export const STAFF_LOCK_NAME = 'gsm-stream-admin';

/** Events of the layer itself and of the notification inbox. Other features add their own names and use them as plain strings. */
export const STREAM_EVENTS = {
  ready: 'ready',
  heartbeat: 'hb',
  notificationCreated: 'notification.created',
  notificationRead: 'notification.read',
  unreadChanged: 'unread.changed',
  resync: 'resync',
  bye: 'bye',
} as const;

/** First frame of a connection. `resumed` is true when the server accepted the cursor and replayed what was missed. */
export interface ReadyData {
  v: number;
  heartbeatMs: number;
  resumed: boolean;
  serverTime: string;
}

/** One inbox item as the stream sends it: exactly the shape of `GET /admin/inbox` (kept equal to `InboxItem` of the notifications feature, which `lib` may not import). */
export interface StreamInboxItem {
  id: Id;
  category: string;
  title: string;
  body: string;
  link: string | null;
  locale: 'en' | 'ar';
  readAt: IsoDateTime | null;
  createdAt: IsoDateTime;
  campaignId: Id | null;
  event: string | null;
}

/** An in-app item was made for this staff member. `live` is false for an item the server replayed after a reconnect (no toast for those). */
export interface NotificationCreatedData {
  item: StreamInboxItem;
  unread: number;
  live: boolean;
}

/** The staff member marked one (`ids: [id]`) or all (`all: true`) read, in any tab or device. */
export interface NotificationReadData {
  ids: Id[];
  all: boolean;
  upToId: Id | null;
  unread: number;
}

/** The unread count (capped at 100) after a connect, a replay or a resync, or after a change that is not a read (a cancelled campaign). */
export interface UnreadChangedData {
  unread: number;
}

/** The server cannot say what was missed: refetch what is on screen. */
export interface ResyncData {
  topics: string[];
}

export type ByeReason = 'max_age' | 'shutdown' | 'session_ended' | 'reauth';

/** The server ends the stream; the client reconnects by itself. */
export interface ByeData {
  reason: ByeReason;
}

/** Every event this feature knows, with the type of its parsed data. `hb` carries unix seconds. */
export interface StreamEventMap {
  ready: ReadyData;
  hb: number;
  'notification.created': NotificationCreatedData;
  'notification.read': NotificationReadData;
  'unread.changed': UnreadChangedData;
  resync: ResyncData;
  bye: ByeData;
}
export type KnownStreamEvent = keyof StreamEventMap;

/** A parser answers the typed data, or null when the frame does not have the documented shape (it is then skipped, never half-used). */
export type StreamParser<T> = (data: unknown) => T | null;

type Obj = Record<string, unknown>;
const isObject = (value: unknown): value is Obj =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
const isCount = (value: unknown): value is number =>
  typeof value === 'number' && Number.isInteger(value) && value >= 0;
const isId = (value: unknown): value is number =>
  typeof value === 'number' && Number.isInteger(value) && value > 0;
const isNullable = (value: unknown, check: (v: unknown) => boolean) => value === null || check(value);
const isText = (value: unknown): value is string => typeof value === 'string';

function parseItem(value: unknown): StreamInboxItem | null {
  if (!isObject(value)) return null;
  const ok =
    isId(value.id) &&
    isText(value.category) &&
    isText(value.title) &&
    isText(value.body) &&
    isNullable(value.link, isText) &&
    (value.locale === 'en' || value.locale === 'ar') &&
    isNullable(value.readAt, isText) &&
    isText(value.createdAt) &&
    isNullable(value.campaignId, isId) &&
    isNullable(value.event, isText);
  return ok ? (value as unknown as StreamInboxItem) : null;
}

export const parseReady: StreamParser<ReadyData> = (data) =>
  isObject(data) && typeof data.resumed === 'boolean' && typeof data.heartbeatMs === 'number'
    ? {
        v: Number(data.v ?? 1),
        heartbeatMs: data.heartbeatMs,
        resumed: data.resumed,
        serverTime: String(data.serverTime ?? ''),
      }
    : null;

export const parseNotificationCreated: StreamParser<NotificationCreatedData> = (data) => {
  if (!isObject(data) || !isCount(data.unread)) return null;
  const item = parseItem(data.item);
  return item ? { item, unread: data.unread, live: data.live === true } : null;
};

export const parseNotificationRead: StreamParser<NotificationReadData> = (data) => {
  if (!isObject(data) || !isCount(data.unread) || !Array.isArray(data.ids) || !data.ids.every(isId))
    return null;
  if (!isNullable(data.upToId, isId)) return null;
  return {
    ids: data.ids as Id[],
    all: data.all === true,
    upToId: (data.upToId ?? null) as Id | null,
    unread: data.unread,
  };
};

export const parseUnreadChanged: StreamParser<UnreadChangedData> = (data) =>
  isObject(data) && isCount(data.unread) ? { unread: data.unread } : null;

export const parseResync: StreamParser<ResyncData> = (data) =>
  isObject(data) && Array.isArray(data.topics) && data.topics.every(isText)
    ? { topics: data.topics as string[] }
    : null;

export const parseBye: StreamParser<ByeData> = (data) =>
  isObject(data) && isText(data.reason) ? { reason: data.reason as ByeReason } : null;

const parseHeartbeat: StreamParser<number> = (data) =>
  typeof data === 'number' && Number.isFinite(data) ? data : null;

/** One parser per known event; `useStreamEvent` runs it before the handler. */
export const STREAM_PARSERS: { [K in KnownStreamEvent]: StreamParser<StreamEventMap[K]> } = {
  ready: parseReady,
  hb: parseHeartbeat,
  'notification.created': parseNotificationCreated,
  'notification.read': parseNotificationRead,
  'unread.changed': parseUnreadChanged,
  resync: parseResync,
  bye: parseBye,
};

export function isKnownStreamEvent(name: string): name is KnownStreamEvent {
  return Object.hasOwn(STREAM_PARSERS, name);
}

/**
 * The key that makes an event count once: an inbox item is handled once however often it arrives (a replay after a reconnect, a second window,
 * a hand-over between tabs). Other events have no key and always pass.
 */
export function streamDedupeKey(name: string, data: unknown): string | undefined {
  if (name !== STREAM_EVENTS.notificationCreated || !isObject(data) || !isObject(data.item)) return undefined;
  return isId(data.item.id) ? `notification:${data.item.id}` : undefined;
}
