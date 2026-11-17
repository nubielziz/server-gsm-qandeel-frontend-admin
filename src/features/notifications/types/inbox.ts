// Types of the staff member's own inbox (`/admin/inbox*`), the data of the bell in the top bar. Written from the backend's
// contracts (feature 23); the routes are backend additions, not in the map (HANDOFF NOTIF-1).
import type { Id, IsoDateTime } from '@/lib/api';

/** What an item is about; the bell picks an icon by it. */
export type InboxCategory =
  'announcement' | 'marketing' | 'order' | 'payment' | 'wallet' | 'billing' | 'support' | 'account' | 'alert';

/** One notification. `title` and `body` are plain text: render them as text, never as HTML. */
export type InboxItem = {
  id: Id;
  category: InboxCategory;
  title: string;
  body: string;
  /** A console path without a host (`/orders?order=7`), or null. */
  link: string | null;
  readAt: IsoDateTime | null;
  createdAt: IsoDateTime;
  /** Set for an item that came from a broadcast. */
  campaignId: Id | null;
  /** Set for an item that came from an event (an order result, a low balance). */
  event: string | null;
};

/** The unread count, capped at 100 by the server: show "99+" when it is 100. */
export type UnreadCount = { unread: number };

/** Body of `POST /admin/inbox/read-all`: `upToId` is the newest item the screen showed, so a newer item stays unread. */
export type ReadAllBody = { upToId?: Id };
export type ReadAllResult = { updated: number };
