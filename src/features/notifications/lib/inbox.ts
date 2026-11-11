// Small rules of the bell: the badge text ("99+" at the server's cap), the label a screen reader hears, the icon of each category and whether an item's
// link is a console path the router may open. Pure.
import type { IconName } from '@/components/ui';
import type { InboxCategory, InboxItem } from '../types';

/** The server caps the unread count at 100; the badge then says "99+". */
export const UNREAD_CAP = 100;

/** The text of the badge: nothing for zero, "99+" for the cap, else the number. */
export function badgeText(unread: number | undefined): string | null {
  if (unread === undefined || unread <= 0) return null;
  return unread >= UNREAD_CAP ? '99+' : String(unread);
}

/** The bell's accessible name: "Notifications, 3 unread"; just "Notifications" while the number is not known. */
export function bellLabel(unread: number | undefined): string {
  if (unread === undefined) return 'Notifications';
  return `Notifications, ${unread >= UNREAD_CAP ? '99+' : unread} unread`;
}

export const CATEGORY_ICON: Record<InboxCategory, IconName> = {
  announcement: 'bell',
  marketing: 'gift',
  order: 'orders',
  payment: 'receipt',
  wallet: 'wallet',
  billing: 'receipt',
  support: 'life',
  account: 'user',
  alert: 'alert',
};

/** Only a path on this app (one leading `/`, not `//`, no scheme) is opened by the router; anything else is ignored. */
export function consolePath(link: string | null): string | null {
  if (!link || !link.startsWith('/') || link.startsWith('//')) return null;
  return link;
}

/** The newest id of the items on screen (what "Mark all read" sends as `upToId`), or undefined for an empty list. */
export function newestId(items: readonly InboxItem[]): number | undefined {
  return items.length === 0 ? undefined : Math.max(...items.map((item) => item.id));
}
