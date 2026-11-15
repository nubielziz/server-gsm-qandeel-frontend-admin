// Fills the stream client's environment from the page (EventSource, Web Locks, BroadcastChannel, timers, page lifecycle, the plain probe route)
// and makes the staff stream client. The only file of the layer that touches browser globals.
import { apiGet, apiUrl, isApiError } from '@/lib/api';
import { STAFF_LOCK_NAME, STAFF_PROBE_PATH, STAFF_STREAM_PATH, streamDedupeKey } from './events';
import { createStreamClient } from './streamClient';
import type { ChannelLike, LocksLike, StreamClient, StreamEnv } from './streamEnv';

/** What `browserStreamEnv` needs to know about one stream. */
export interface BrowserStreamOptions {
  /** Path of the stream route. */
  path: string;
  /** Path of a plain GET route of the same session, asked after a failed connect (401, 403, 429 or 200 tell the client what to do). */
  probePath: string;
  /** Name of the Web Lock and the BroadcastChannel: one per browser and surface. */
  lockName: string;
}

/** The page language the server writes the item text in (the console is English; `lang` says otherwise only if that changes). */
function pageLocale(): 'en' | 'ar' | undefined {
  const lang = typeof document === 'undefined' ? '' : document.documentElement.lang.toLowerCase();
  if (lang.startsWith('ar')) return 'ar';
  return lang.startsWith('en') ? 'en' : undefined;
}

/** True when this browser can open a stream. Without `EventSource` the app keeps polling, as before. */
export function canOpenStream(): boolean {
  return typeof globalThis.EventSource === 'function';
}

/** The dev mock layer's fake EventSource says so: a pushed mock event reaches only the tab that made the request, so each tab keeps its own stream. */
function isMockEventSource(): boolean {
  return (globalThis.EventSource as { isMockEventSource?: boolean } | undefined)?.isMockEventSource === true;
}

/** The environment of one stream in this page. `withCredentials` is always on: it does nothing on the same origin and sends the session cookie to an API on another subdomain. */
export function browserStreamEnv(options: BrowserStreamOptions): StreamEnv {
  const locks = typeof navigator === 'undefined' || isMockEventSource() ? null : (navigator.locks ?? null);
  const hasChannel = typeof BroadcastChannel === 'function' && !isMockEventSource();
  return {
    streamUrl: (cursor) => apiUrl(options.path, { locale: pageLocale(), cursor }),
    createEventSource: (url) => new globalThis.EventSource(url, { withCredentials: true }),
    lockName: options.lockName,
    locks: locks as LocksLike | null,
    createChannel: hasChannel ? (name) => new BroadcastChannel(name) as unknown as ChannelLike : null,
    timers: {
      setTimeout: (callback, ms) => window.setTimeout(callback, ms),
      clearTimeout: (handle) => window.clearTimeout(handle as number),
    },
    random: () => Math.random(),
    probe: async () => {
      try {
        await apiGet(options.probePath);
        return { status: 200 };
      } catch (error) {
        return isApiError(error)
          ? { status: error.status, retryAfterSeconds: error.retryAfter }
          : { status: 0 };
      }
    },
    lifecycle: {
      onHide: (callback) => {
        window.addEventListener('pagehide', callback);
        document.addEventListener('freeze', callback);
        return () => {
          window.removeEventListener('pagehide', callback);
          document.removeEventListener('freeze', callback);
        };
      },
      onShow: (callback) => {
        window.addEventListener('pageshow', callback);
        document.addEventListener('resume', callback);
        return () => {
          window.removeEventListener('pageshow', callback);
          document.removeEventListener('resume', callback);
        };
      },
    },
    dedupeKey: streamDedupeKey,
    onListenerError: (error) => console.error('A live event handler failed.', error),
  };
}

/** The staff member's stream client for this page (not started). */
export function createStaffStreamClient(): StreamClient {
  return createStreamClient(
    browserStreamEnv({ path: STAFF_STREAM_PATH, probePath: STAFF_PROBE_PATH, lockName: STAFF_LOCK_NAME }),
  );
}
