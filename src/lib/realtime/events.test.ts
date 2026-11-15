// Tests for the staff stream's event parsers and the dedupe key: the documented examples parse, anything else is refused (never half-used).
import { describe, expect, it } from 'vitest';
import {
  isKnownStreamEvent,
  parseBye,
  parseNotificationCreated,
  parseNotificationRead,
  parseReady,
  parseResync,
  parseUnreadChanged,
  streamDedupeKey,
} from './events';

const ITEM = {
  id: 12,
  category: 'order',
  title: 'An order needs attention',
  body: 'Order 1042 timed out.',
  link: '/orders?order=1042',
  locale: 'en',
  readAt: null,
  createdAt: '2026-11-15T10:00:00.000Z',
  campaignId: null,
  event: 'order.needs_attention',
};

describe('parsers', () => {
  it('parse the documented examples', () => {
    expect(
      parseReady({ v: 1, heartbeatMs: 15000, resumed: false, serverTime: '2026-11-15T10:00:00.000Z' }),
    ).toEqual({
      v: 1,
      heartbeatMs: 15000,
      resumed: false,
      serverTime: '2026-11-15T10:00:00.000Z',
    });
    expect(parseNotificationCreated({ item: ITEM, unread: 3, live: true })).toEqual({
      item: ITEM,
      unread: 3,
      live: true,
    });
    expect(parseNotificationRead({ ids: [12], all: false, upToId: null, unread: 2 })).toEqual({
      ids: [12],
      all: false,
      upToId: null,
      unread: 2,
    });
    expect(parseNotificationRead({ ids: [], all: true, upToId: 40, unread: 0 })).toMatchObject({
      all: true,
      upToId: 40,
    });
    expect(parseUnreadChanged({ unread: 100 })).toEqual({ unread: 100 });
    expect(parseResync({ topics: ['inbox'] })).toEqual({ topics: ['inbox'] });
    expect(parseBye({ reason: 'max_age' })).toEqual({ reason: 'max_age' });
  });

  it('refuse a frame that does not have the documented shape', () => {
    expect(parseReady({ v: 1 })).toBeNull();
    expect(parseReady(null)).toBeNull();
    expect(parseNotificationCreated({ item: { ...ITEM, id: 'x' }, unread: 1, live: true })).toBeNull();
    expect(parseNotificationCreated({ item: { ...ITEM, locale: 'fr' }, unread: 1, live: true })).toBeNull();
    expect(parseNotificationCreated({ item: ITEM, unread: -1, live: true })).toBeNull();
    expect(parseNotificationCreated({ item: ITEM })).toBeNull();
    expect(parseNotificationCreated([])).toBeNull();
    expect(parseNotificationRead({ ids: ['a'], all: false, upToId: null, unread: 1 })).toBeNull();
    expect(parseNotificationRead({ ids: [1], all: false, upToId: 'z', unread: 1 })).toBeNull();
    expect(parseUnreadChanged({ unread: '3' })).toBeNull();
    expect(parseUnreadChanged({ unread: 1.5 })).toBeNull();
    expect(parseResync({ topics: [1] })).toBeNull();
    expect(parseBye({})).toBeNull();
  });

  it('treat a missing "live" as not live, so an odd frame never raises a toast', () => {
    expect(parseNotificationCreated({ item: ITEM, unread: 1 })?.live).toBe(false);
  });

  it('know the names of the events of this feature and only those', () => {
    for (const name of [
      'ready',
      'hb',
      'notification.created',
      'notification.read',
      'unread.changed',
      'resync',
      'bye',
    ]) {
      expect(isKnownStreamEvent(name)).toBe(true);
    }
    expect(isKnownStreamEvent('ticket.updated')).toBe(false);
    expect(isKnownStreamEvent('toString')).toBe(false);
  });
});

describe('the dedupe key', () => {
  it('is the item id for a created notification and nothing for any other event', () => {
    expect(streamDedupeKey('notification.created', { item: ITEM, unread: 1, live: true })).toBe(
      'notification:12',
    );
    expect(streamDedupeKey('notification.created', { item: { id: 'x' } })).toBeUndefined();
    expect(streamDedupeKey('notification.created', null)).toBeUndefined();
    expect(streamDedupeKey('notification.read', { ids: [12] })).toBeUndefined();
    expect(streamDedupeKey('unread.changed', { unread: 1 })).toBeUndefined();
  });
});
