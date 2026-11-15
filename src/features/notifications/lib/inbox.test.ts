// Tests for the bell's small rules: the badge text and label, which links the router may open, and the newest id.
import { describe, expect, it } from 'vitest';
import { inboxItem } from '../test/fixtures';
import { badgeText, bellLabel, consolePath, newestId, toastBody, TOAST_BODY_LIMIT } from './inbox';

describe('the badge', () => {
  it('shows nothing for zero, the number below the cap and 99+ at the cap', () => {
    expect(badgeText(undefined)).toBeNull();
    expect(badgeText(0)).toBeNull();
    expect(badgeText(3)).toBe('3');
    expect(badgeText(99)).toBe('99');
    expect(badgeText(100)).toBe('99+');
  });

  it('names the bell with the unread number', () => {
    expect(bellLabel(undefined)).toBe('Notifications');
    expect(bellLabel(0)).toBe('Notifications, 0 unread');
    expect(bellLabel(3)).toBe('Notifications, 3 unread');
    expect(bellLabel(100)).toBe('Notifications, 99+ unread');
  });
});

describe('links', () => {
  it('opens only a path on this app', () => {
    expect(consolePath('/orders?order=7')).toBe('/orders?order=7');
    expect(consolePath(null)).toBeNull();
    expect(consolePath('')).toBeNull();
    expect(consolePath('https://evil.example')).toBeNull();
    expect(consolePath('//evil.example')).toBeNull();
    expect(consolePath('javascript:alert(1)')).toBeNull();
  });

  it('finds the newest id of the items on screen', () => {
    expect(newestId([])).toBeUndefined();
    expect(newestId([inboxItem({ id: 4 }), inboxItem({ id: 9 }), inboxItem({ id: 2 })])).toBe(9);
  });
});

describe('the toast text', () => {
  it('collapses line breaks and extra spaces into one line', () => {
    expect(toastBody('Order 1042 timed out.\n\nCheck   it.')).toBe('Order 1042 timed out. Check it.');
    expect(toastBody('')).toBe('');
  });

  it('keeps a short text and cuts a long one at 120 characters with an ellipsis', () => {
    const exact = 'a'.repeat(TOAST_BODY_LIMIT);
    expect(toastBody(exact)).toBe(exact);
    const cut = toastBody('word '.repeat(60));
    expect(cut.length).toBeLessThanOrEqual(TOAST_BODY_LIMIT);
    expect(cut.endsWith('…')).toBe(true);
  });
});
