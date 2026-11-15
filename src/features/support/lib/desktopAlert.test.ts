// Tests for the desktop notification: shown only when the browser has the API and the permission, with the words it is given and a click that opens the ticket.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { desktopAlertsSupported, showDesktopAlert } from './desktopAlert';

const made: {
  title: string;
  options: NotificationOptions;
  onclick: (() => void) | null;
  close: () => void;
}[] = [];

function fakeNotification(permission: NotificationPermission) {
  class FakeNotification {
    static permission = permission;
    title: string;
    options: NotificationOptions;
    onclick: (() => void) | null = null;
    close = vi.fn();
    constructor(title: string, options: NotificationOptions) {
      this.title = title;
      this.options = options;
      made.push(this);
    }
  }
  vi.stubGlobal('Notification', FakeNotification);
}

afterEach(() => {
  made.length = 0;
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const words = { title: 'New message on T-10', body: 'Victor Silva', tag: 'support-ticket-10' };

describe('showDesktopAlert', () => {
  it('shows the title, the name and the tag when the browser allowed it', () => {
    fakeNotification('granted');
    expect(showDesktopAlert({ ...words, onOpen: vi.fn() })).toBe(true);
    expect(made).toHaveLength(1);
    expect(made[0]).toMatchObject({
      title: 'New message on T-10',
      options: { body: 'Victor Silva', tag: 'support-ticket-10' },
    });
  });

  it('shows nothing without permission, or in a browser with no notifications', () => {
    fakeNotification('default');
    expect(showDesktopAlert({ ...words, onOpen: vi.fn() })).toBe(false);
    fakeNotification('denied');
    expect(showDesktopAlert({ ...words, onOpen: vi.fn() })).toBe(false);
    vi.stubGlobal('Notification', undefined);
    expect(desktopAlertsSupported()).toBe(false);
    expect(showDesktopAlert({ ...words, onOpen: vi.fn() })).toBe(false);
    expect(made).toHaveLength(0);
  });

  it('focuses the window, opens the ticket and closes the notification on a click', () => {
    fakeNotification('granted');
    const focus = vi.spyOn(window, 'focus').mockImplementation(() => {});
    const onOpen = vi.fn();
    showDesktopAlert({ ...words, onOpen });
    made[0].onclick?.();
    expect(focus).toHaveBeenCalled();
    expect(onOpen).toHaveBeenCalledTimes(1);
    expect(made[0].close).toHaveBeenCalled();
  });

  it('answers false when the browser throws (a page that may not notify)', () => {
    vi.stubGlobal(
      'Notification',
      Object.assign(
        function Boom() {
          throw new Error('no');
        },
        { permission: 'granted' },
      ),
    );
    expect(showDesktopAlert({ ...words, onOpen: vi.fn() })).toBe(false);
  });
});
