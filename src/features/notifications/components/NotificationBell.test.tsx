// Tests for the staff bell in the top bar, run inside the real shell against the dev mock API: the badge and its label (99+ at the cap), asking only with a signed-in
// staff member, polling that pauses while the tab is hidden, the live stream (an event changes the badge with no request, a toast for a new item, the poll slows
// while the stream is open and runs as before when it is closed, a resync refetches), the panel (newest first, unread marked, "Unread only", Load more), marking
// read, links and keyboard, the arrival animation (one icon element, swung in place) and the arrival sound (after a first press, never when turned off).
import { act, fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { Route } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getToasts } from '@/components/ui';
import { mockServer } from '@/mocks/node';
import { problem } from '@/mocks/problem';
import {
  failMockStreams,
  installMockEventSource,
  MockEventSource,
  openMockStreamCount,
  pushMockStreamEvent,
  uninstallMockEventSource,
} from '@/mocks/stream';
import { mockMe, renderShell, setupMockApi, signInAs } from '@/test/renderApp';
import { resetSharedAudioContext } from '@/lib/sharedAudio';
import { FakeAudioContext } from '../test/fakeAudio';
import { inboxItem } from '../test/fixtures';
import { recordRequests } from '../test/notificationsPage';
import type { InboxItem } from '../types';

setupMockApi();
vi.setConfig({ testTimeout: 20_000 });
afterEach(() => {
  vi.useRealTimers();
  mockServer.events.removeAllListeners();
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' });
});

/** jsdom has no Web Animations API: this stand-in records each swing of the bell (the element it moves) and whether it was stopped. */
interface Swing {
  el: Element;
  stopped: boolean;
  finish(): void;
}
const swings: Swing[] = [];
const playing = () => swings.filter((swing) => !swing.stopped);
const nativeAnimate = Element.prototype.animate;
beforeEach(() => {
  swings.length = 0;
  Element.prototype.animate = function (this: Element) {
    const animation = {
      onfinish: null as null | (() => void),
      cancel: () => {
        swing.stopped = true;
      },
    };
    const swing: Swing = { el: this, stopped: false, finish: () => animation.onfinish?.() };
    swings.push(swing);
    return animation as unknown as Animation;
  };
});
afterEach(() => {
  Element.prototype.animate = nativeAnimate;
});

const page = (
  <>
    <Route path="/somewhere" element={<p>Somewhere page</p>} />
    <Route path="/orders" element={<p>Orders page</p>} />
    <Route path="/support" element={<p>Support page</p>} />
  </>
);

/** Renders the shell signed in as the Owner (the mock's own session) and returns the bell button. */
async function openShell(route = '/somewhere') {
  await signInAs();
  const app = renderShell(route, page);
  await screen.findByText(/page$/);
  return app;
}
const bell = () => screen.findByRole('button', { name: /^Notifications/ });

/** Serves an inbox of these items (newest first) with the given unread count; returns the addresses of the list calls. */
function serveInbox(
  items: InboxItem[],
  unread = items.filter((item) => item.readAt === null).length,
  total = items.length,
) {
  const lists: URL[] = [];
  mockServer.use(
    http.get('*/admin/inbox/unread-count', () => HttpResponse.json({ unread })),
    http.get('*/admin/inbox', ({ request }) => {
      const url = new URL(request.url);
      lists.push(url);
      const start = Number(url.searchParams.get('_start') ?? 0);
      const end = Number(url.searchParams.get('_end') ?? items.length);
      const rows =
        url.searchParams.get('unread') === 'true' ? items.filter((item) => item.readAt === null) : items;
      return HttpResponse.json(rows.slice(start, end), {
        headers: { 'x-total-count': String(rows.length === items.length ? total : rows.length) },
      });
    }),
  );
  return lists;
}

describe('the badge', () => {
  it('shows the unread number and names the bell with it', async () => {
    await openShell();
    const button = await bell();
    await waitFor(() => expect(button).toHaveAccessibleName('Notifications, 2 unread'));
    expect(within(button).getByText('2')).toBeInTheDocument();
  });

  it("shows 99+ at the server's cap of 100, and nothing for zero", async () => {
    serveInbox([], 100);
    await openShell();
    const button = await bell();
    await waitFor(() => expect(button).toHaveAccessibleName('Notifications, 99+ unread'));
    expect(within(button).getByText('99+')).toBeInTheDocument();
  });

  it('has no number when everything is read', async () => {
    serveInbox([inboxItem({ readAt: '2026-11-10T10:00:00.000Z' })], 0);
    await openShell();
    const button = await bell();
    await waitFor(() => expect(button).toHaveAccessibleName('Notifications, 0 unread'));
    expect(button.querySelector('.count')).toBeNull();
  });

  it('does not ask for the number before the staff member is known', async () => {
    const asked = recordRequests('/admin/inbox/unread-count');
    await signInAs();
    // `me` arrives late: the bell must wait for it.
    mockMe({ permissions: ['*'] });
    mockServer.use(
      http.get('*/admin/auth/me', async () => {
        await new Promise((resolve) => setTimeout(resolve, 400));
        return HttpResponse.json({
          id: 1,
          email: 'r@x.example',
          name: 'Rami K.',
          status: 'active',
          role: { id: 1, name: 'Owner' },
          permissions: ['*'],
          twofaEnabled: true,
          mustChangePassword: false,
          lastLoginAt: null,
          lastLoginIp: null,
        });
      }),
    );
    renderShell('/somewhere', page);
    await new Promise((resolve) => setTimeout(resolve, 150));
    expect(asked).toEqual([]);
    await screen.findByText(/page$/);
    await waitFor(() => expect(asked.length).toBeGreaterThan(0));
  });
});

describe('the refresh', () => {
  it('asks again every 60 seconds while the tab is visible, and not while it is hidden', async () => {
    let reads = 0;
    mockServer.use(http.get('*/admin/inbox/unread-count', () => HttpResponse.json({ unread: ++reads })));
    vi.useFakeTimers({ shouldAdvanceTime: true });
    await openShell();
    await waitFor(() => expect(reads).toBe(1));
    await vi.advanceTimersByTimeAsync(60_500);
    await waitFor(() => expect(reads).toBe(2));
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' });
    await vi.advanceTimersByTimeAsync(180_000);
    expect(reads).toBe(2);
    await expect(bell()).resolves.toHaveAccessibleName('Notifications, 2 unread');
  });

  it('asks again when the tab is shown again and when the window gets the focus back', async () => {
    let reads = 0;
    mockServer.use(http.get('*/admin/inbox/unread-count', () => HttpResponse.json({ unread: ++reads })));
    await openShell();
    const button = await bell();
    // Each event is sent only after the previous read has settled: React Query skips a refetch while one is in flight.
    await waitFor(() => expect(button).toHaveAccessibleName('Notifications, 1 unread'));
    act(() => {
      document.dispatchEvent(new Event('visibilitychange', { bubbles: true }));
    });
    await waitFor(() => expect(button).toHaveAccessibleName('Notifications, 2 unread'));
    act(() => {
      window.dispatchEvent(new Event('focus'));
    });
    await waitFor(() => expect(button).toHaveAccessibleName('Notifications, 3 unread'));
    expect(reads).toBe(3);
  });

  it('does not ask on focus while the tab is hidden', async () => {
    let reads = 0;
    mockServer.use(http.get('*/admin/inbox/unread-count', () => HttpResponse.json({ unread: ++reads })));
    await openShell();
    await waitFor(() => expect(reads).toBe(1));
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' });
    act(() => {
      window.dispatchEvent(new Event('focus'));
    });
    await new Promise((resolve) => setTimeout(resolve, 200));
    expect(reads).toBe(1);
  });
});

describe('the panel', () => {
  it('opens with the newest items first, the unread ones marked, and plain text with its line breaks', async () => {
    const user = userEvent.setup();
    await openShell();
    await user.click(await bell());
    const panel = within(await screen.findByRole('dialog', { name: 'Notifications' }));
    const rows = await panel.findAllByRole('button', { name: /\S/, hidden: false });
    const items = panel
      .getAllByRole('button')
      .filter((button) => button.hasAttribute('data-unread') || button.className.includes('hover:bg-hover'));
    expect(items).toHaveLength(4);
    expect(items[0]).toHaveTextContent('An order needs attention');
    expect(items[0]).toHaveTextContent('Unread');
    expect(items[0].querySelector('span.whitespace-pre-line')).not.toBeNull();
    expect(items[0].querySelector('span.whitespace-pre-line')?.textContent).toBe(
      'Order 1042 timed out at the supplier.\nCheck it before the SLA ends.',
    );
    expect(items[2]).toHaveTextContent('Scheduled maintenance on Friday');
    expect(panel.getAllByText('Unread')).toHaveLength(2);
    expect(rows.length).toBeGreaterThan(0);
  });

  it('never runs markup in a title or text: it is shown as text', async () => {
    const user = userEvent.setup();
    serveInbox([
      inboxItem({ id: 9, title: '<img src=x onerror=alert(1)>', body: '<script>alert(1)</script>' }),
    ]);
    await openShell();
    await user.click(await bell());
    const panel = within(await screen.findByRole('dialog', { name: 'Notifications' }));
    expect(await panel.findByText('<img src=x onerror=alert(1)>')).toBeInTheDocument();
    expect(panel.getByText('<script>alert(1)</script>')).toBeInTheDocument();
    expect(document.querySelector('img[src="x"]')).toBeNull();
  });

  it('says there is nothing yet, and nothing unread', async () => {
    const user = userEvent.setup();
    serveInbox([], 0);
    await openShell();
    await user.click(await bell());
    const panel = within(await screen.findByRole('dialog', { name: 'Notifications' }));
    expect(await panel.findByText('No notifications yet.')).toBeInTheDocument();
    await user.click(panel.getByRole('switch', { name: 'Unread only' }));
    expect(await panel.findByText('Nothing unread.')).toBeInTheDocument();
  });

  it('shows the error with Retry', async () => {
    const user = userEvent.setup();
    let fail = true;
    mockServer.use(
      http.get('*/admin/inbox', () =>
        fail
          ? problem(500, 'INTERNAL', 'Server error', 'Boom.')
          : HttpResponse.json([inboxItem({ title: 'Back' })], { headers: { 'x-total-count': '1' } }),
      ),
    );
    await openShell();
    await user.click(await bell());
    const panel = within(await screen.findByRole('dialog', { name: 'Notifications' }));
    expect(await panel.findByText('Could not load notifications')).toBeInTheDocument();
    fail = false;
    await user.click(panel.getByRole('button', { name: 'Retry' }));
    expect(await panel.findByText('Back')).toBeInTheDocument();
  });

  it('asks only while it is open, and shows only the unread items with the switch', async () => {
    const user = userEvent.setup();
    const lists = serveInbox([
      inboxItem({ id: 3, title: 'New one' }),
      inboxItem({ id: 2, title: 'Old one', readAt: '2026-11-10T10:00:00.000Z' }),
    ]);
    await openShell();
    await bell();
    expect(lists).toEqual([]);
    await user.click(await bell());
    const panel = within(await screen.findByRole('dialog', { name: 'Notifications' }));
    expect(await panel.findByText('Old one')).toBeInTheDocument();
    await user.click(panel.getByRole('switch', { name: 'Unread only' }));
    await waitFor(() => expect(lists.at(-1)?.searchParams.get('unread')).toBe('true'));
    await waitFor(() => expect(panel.queryByText('Old one')).not.toBeInTheDocument());
    expect(panel.getByText('New one')).toBeInTheDocument();
  });
});

describe('Load more', () => {
  it('shows 20 first and the next 20 on each press, until the end', async () => {
    const user = userEvent.setup();
    const items = Array.from({ length: 45 }, (_, index) =>
      inboxItem({ id: 45 - index, title: `Item ${45 - index}`, readAt: '2026-11-10T10:00:00.000Z' }),
    );
    const lists = serveInbox(items, 0);
    await openShell();
    await user.click(await bell());
    const panel = within(await screen.findByRole('dialog', { name: 'Notifications' }));
    expect(await panel.findByText('Item 45')).toBeInTheDocument();
    expect(panel.queryByText('Item 25')).not.toBeInTheDocument();
    expect(Object.fromEntries(lists[0].searchParams)).toMatchObject({ _start: '0', _end: '20' });
    await user.click(panel.getByRole('button', { name: 'Load more' }));
    expect(await panel.findByText('Item 25')).toBeInTheDocument();
    expect(Object.fromEntries(lists.at(-1)?.searchParams ?? [])).toMatchObject({ _start: '20', _end: '40' });
    await user.click(panel.getByRole('button', { name: 'Load more' }));
    expect(await panel.findByText('Item 1')).toBeInTheDocument();
    expect(panel.queryByRole('button', { name: 'Load more' })).not.toBeInTheDocument();
  });
});

describe('marking read', () => {
  it('Mark all read sends the newest id on screen, and the number drops to zero', async () => {
    const user = userEvent.setup();
    const sent = recordRequests('/admin/inbox/read-all');
    await openShell();
    await waitFor(async () => expect(await bell()).toHaveAccessibleName('Notifications, 2 unread'));
    await user.click(await bell());
    const panel = within(await screen.findByRole('dialog', { name: 'Notifications' }));
    await panel.findByText('An order needs attention');
    await user.click(panel.getByRole('button', { name: 'Mark all read' }));
    await waitFor(() => expect(sent).toHaveLength(1));
    expect(sent[0].body).toEqual({ upToId: 5 });
    await waitFor(async () => expect(await bell()).toHaveAccessibleName('Notifications, 0 unread'));
    await waitFor(() => expect(panel.queryAllByText('Unread')).toHaveLength(0));
    expect(panel.getByRole('button', { name: 'Mark all read' })).toBeDisabled();
  });

  it('clicking an unread item marks it read, and an item with a link opens it and closes the panel', async () => {
    const user = userEvent.setup();
    const sent = recordRequests('/admin/inbox/5/read');
    const app = await openShell();
    await user.click(await bell());
    const panel = within(await screen.findByRole('dialog', { name: 'Notifications' }));
    await user.click(await panel.findByRole('button', { name: /An order needs attention/ }));
    await waitFor(() => expect(sent).toHaveLength(1));
    expect(sent[0].method).toBe('POST');
    expect(await screen.findByText('Orders page')).toBeInTheDocument();
    expect(app.location()).toBe('/orders?order=1042');
    expect(screen.queryByRole('dialog', { name: 'Notifications' })).not.toBeInTheDocument();
    await waitFor(async () => expect(await bell()).toHaveAccessibleName('Notifications, 1 unread'));
  });

  it('rolls the number down after a read in the panel, without the live stream', async () => {
    const user = userEvent.setup();
    await openShell();
    const button = await bell();
    await waitFor(() => expect(button).toHaveAccessibleName('Notifications, 2 unread'));
    await user.click(button);
    const panel = within(await screen.findByRole('dialog', { name: 'Notifications' }));
    await user.click(await panel.findByRole('button', { name: /An order needs attention/ }));
    await waitFor(async () => expect(await bell()).toHaveAccessibleName('Notifications, 1 unread'));
    const badge = (await bell()).querySelector('.count') as HTMLElement;
    expect(badge.querySelector('.count-out-down')).toHaveTextContent('2');
    expect(badge.querySelector('.count-in-down')).toHaveTextContent('1');
    expect(swings).toEqual([]);
  });

  it('keeps the panel open for an item with no link, and marks nothing for one already read', async () => {
    const user = userEvent.setup();
    const sent = recordRequests('/admin/inbox/');
    await openShell();
    await user.click(await bell());
    const panel = within(await screen.findByRole('dialog', { name: 'Notifications' }));
    await user.click(await panel.findByRole('button', { name: /Scheduled maintenance on Friday/ }));
    await waitFor(() => expect(sent.filter((request) => request.method === 'POST')).toHaveLength(1));
    expect(screen.getByRole('dialog', { name: 'Notifications' })).toBeInTheDocument();
    await user.click(panel.getByRole('button', { name: /A ticket is late/ }));
    // The ticket item is already read and has a link: it opens, with no read call.
    expect(await screen.findByText('Support page')).toBeInTheDocument();
    expect(sent.filter((request) => request.method === 'POST')).toHaveLength(1);
  });

  it('ignores a link that is not a path on this app, and still marks the item read', async () => {
    const user = userEvent.setup();
    const sent = recordRequests('/admin/inbox/9/read');
    serveInbox([inboxItem({ id: 9, title: 'Phish', link: 'https://evil.example/login' })]);
    mockServer.use(http.post('*/admin/inbox/9/read', () => new HttpResponse(null, { status: 204 })));
    const app = await openShell();
    await user.click(await bell());
    await user.click(await screen.findByRole('button', { name: /Phish/ }));
    await waitFor(() => expect(sent).toHaveLength(1));
    expect(app.location()).toBe('/somewhere');
  });
});

describe('the keyboard', () => {
  it('closes with Escape and gives the focus back to the bell', async () => {
    const user = userEvent.setup();
    await openShell();
    const button = await bell();
    await user.click(button);
    expect(await screen.findByRole('dialog', { name: 'Notifications' })).toBeInTheDocument();
    expect(button).toHaveAttribute('aria-expanded', 'true');
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog', { name: 'Notifications' })).not.toBeInTheDocument();
    expect(button).toHaveFocus();
    expect(button).toHaveAttribute('aria-expanded', 'false');
  });

  it('opens and closes with the button, and closes on a click outside', async () => {
    const user = userEvent.setup();
    await openShell();
    const button = await bell();
    await user.click(button);
    await screen.findByRole('dialog', { name: 'Notifications' });
    await user.click(button);
    expect(screen.queryByRole('dialog', { name: 'Notifications' })).not.toBeInTheDocument();
    await user.click(button);
    await screen.findByRole('dialog', { name: 'Notifications' });
    await user.click(screen.getByText('Somewhere page'));
    expect(screen.queryByRole('dialog', { name: 'Notifications' })).not.toBeInTheDocument();
  });
});

describe('the live stream', () => {
  beforeEach(() => {
    MockEventSource.readyDelayMs = 0;
    MockEventSource.heartbeatMs = 0;
    installMockEventSource();
  });
  afterEach(() => {
    uninstallMockEventSource();
    MockEventSource.readyDelayMs = 20;
    MockEventSource.heartbeatMs = 15_000;
  });

  const liveItem = (id: number, change: Partial<InboxItem> = {}) =>
    inboxItem({ id, title: `Live ${id}`, body: 'Order 1042 timed out.\nCheck it.', readAt: null, ...change });
  const push = (name: string, data: unknown, id?: string) => act(() => pushMockStreamEvent(name, data, id));
  const created = (item: InboxItem, unread: number, live = true) => ({ item, unread, live });
  /** Waits until the stream is open and has told the bell so (the stream's `ready` has been handled). */
  const streamOpen = () => waitFor(() => expect(openMockStreamCount()).toBe(1));

  it('opens one stream once the staff member is known and closes it when the shell goes away', async () => {
    mockServer.use(
      http.get('*/admin/auth/me', async () => {
        await new Promise((resolve) => setTimeout(resolve, 400));
        return HttpResponse.json({
          id: 1,
          email: 'r@x.example',
          name: 'Rami K.',
          status: 'active',
          role: { id: 1, name: 'Owner' },
          permissions: ['*'],
          twofaEnabled: true,
          mustChangePassword: false,
          lastLoginAt: null,
          lastLoginIp: null,
        });
      }),
    );
    await signInAs();
    const app = renderShell('/somewhere', page);
    await new Promise((resolve) => setTimeout(resolve, 150));
    expect(openMockStreamCount()).toBe(0);
    await screen.findByText(/page$/);
    await streamOpen();
    app.unmount();
    expect(openMockStreamCount()).toBe(0);
  });

  it('changes the badge from unread.changed and notification.read without asking the server', async () => {
    const asked = recordRequests('/admin/inbox/unread-count');
    await openShell();
    const button = await bell();
    await waitFor(() => expect(button).toHaveAccessibleName('Notifications, 2 unread'));
    await streamOpen();
    const before = asked.length;
    push('unread.changed', { unread: 7 });
    await waitFor(() => expect(button).toHaveAccessibleName('Notifications, 7 unread'));
    push('notification.read', { ids: [5], all: false, upToId: null, unread: 6 });
    await waitFor(() => expect(button).toHaveAccessibleName('Notifications, 6 unread'));
    push('notification.read', { ids: [], all: true, upToId: 9, unread: 0 });
    await waitFor(() => expect(button).toHaveAccessibleName('Notifications, 0 unread'));
    expect(asked.length).toBe(before);
  });

  it('shows a new item at once: the badge, a toast with its title and the start of its text, and the open list asks again', async () => {
    const user = userEvent.setup();
    const lists = serveInbox([inboxItem({ id: 1, title: 'Old', readAt: null })], 1);
    await openShell();
    const button = await bell();
    await user.click(button);
    await screen.findByText('Old');
    await streamOpen();
    const before = lists.length;
    push('notification.created', created(liveItem(40), 2), 'i40');
    await waitFor(() => expect(button).toHaveAccessibleName('Notifications, 2 unread'));
    expect(getToasts()).toEqual([
      expect.objectContaining({
        id: 'notification-40',
        kind: 'info',
        title: 'Live 40',
        body: 'Order 1042 timed out. Check it.',
      }),
    ]);
    await waitFor(() => expect(lists.length).toBeGreaterThan(before));
  });

  it('shows no toast for an item the server replayed or in a hidden tab, and counts an item once', async () => {
    await openShell();
    const button = await bell();
    await waitFor(() => expect(button).toHaveAccessibleName('Notifications, 2 unread'));
    await streamOpen();
    push('notification.created', created(liveItem(41), 3, false), 'i41');
    await waitFor(() => expect(button).toHaveAccessibleName('Notifications, 3 unread'));
    expect(getToasts()).toEqual([]);
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' });
    push('notification.created', created(liveItem(42), 4), 'i42');
    await waitFor(() => expect(button).toHaveAccessibleName('Notifications, 4 unread'));
    expect(getToasts()).toEqual([]);
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' });
    // The same item again (a replay, a second window): ignored, so the number from the repeat is not used.
    push('notification.created', created(liveItem(42), 9), 'i42');
    push('unread.changed', { unread: 4 });
    expect(button).toHaveAccessibleName('Notifications, 4 unread');
    expect(getToasts()).toEqual([]);
  });

  it('asks every 5 minutes instead of every 60 seconds while the stream is open, and every 60 seconds again once it is closed', async () => {
    let reads = 0;
    mockServer.use(http.get('*/admin/inbox/unread-count', () => HttpResponse.json({ unread: ++reads })));
    // The mock stream beats like the server (every 15 s), or the client's 45 s watchdog would reconnect it and refetch.
    MockEventSource.heartbeatMs = 15_000;
    vi.useFakeTimers({ shouldAdvanceTime: true });
    await openShell();
    await waitFor(() => expect(reads).toBe(1));
    await streamOpen();
    await vi.advanceTimersByTimeAsync(0);
    await vi.advanceTimersByTimeAsync(240_000);
    expect(reads).toBe(1);
    await vi.advanceTimersByTimeAsync(60_500);
    await waitFor(() => expect(reads).toBe(2));
    // The stream drops and cannot come back (no EventSource): the old 60 s poll is back.
    act(() => {
      failMockStreams();
      uninstallMockEventSource();
    });
    await vi.advanceTimersByTimeAsync(61_000);
    await waitFor(() => expect(reads).toBeGreaterThanOrEqual(3));
    await vi.advanceTimersByTimeAsync(61_000);
    await waitFor(() => expect(reads).toBeGreaterThanOrEqual(4));
  });

  it('refetches the number and the open list on a resync, and when the stream comes back', async () => {
    const user = userEvent.setup();
    const lists = serveInbox([inboxItem({ id: 1, title: 'Old' })], 0);
    const asked = recordRequests('/admin/inbox/unread-count');
    vi.useFakeTimers({ shouldAdvanceTime: true });
    await openShell();
    await user.click(await bell());
    await screen.findByText('Old');
    await streamOpen();
    await vi.advanceTimersByTimeAsync(0);
    let reads = asked.length;
    let listed = lists.length;
    push('resync', { topics: ['inbox'] });
    await waitFor(() => expect(asked.length).toBeGreaterThan(reads));
    await waitFor(() => expect(lists.length).toBeGreaterThan(listed));
    reads = asked.length;
    listed = lists.length;
    // The stream drops and reconnects: the second ready of the page load asks again.
    act(() => failMockStreams());
    await vi.advanceTimersByTimeAsync(6_000);
    await waitFor(() => expect(asked.length).toBeGreaterThan(reads));
    await waitFor(() => expect(lists.length).toBeGreaterThan(listed));
  });

  it('ignores a frame with the wrong shape', async () => {
    await openShell();
    const button = await bell();
    await waitFor(() => expect(button).toHaveAccessibleName('Notifications, 2 unread'));
    await streamOpen();
    push('unread.changed', { unread: 'many' });
    push('notification.created', { item: { id: 1 } });
    expect(button).toHaveAccessibleName('Notifications, 2 unread');
    expect(getToasts()).toEqual([]);
  });

  describe('the arrival animation', () => {
    const icon = (button: HTMLElement) => button.querySelector('svg') as SVGElement;
    const setVisibility = (state: 'visible' | 'hidden') =>
      act(() => {
        Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => state });
        document.dispatchEvent(new Event('visibilitychange'));
      });
    /** The ring window (3 s) lives as long as the module: each test jumps an hour past the one before, so no earlier ring counts. */
    let hours = 0;
    const freshClock = () => {
      hours += 1;
      vi.useFakeTimers({ shouldAdvanceTime: true });
      vi.setSystemTime(Date.now() + hours * 3_600_000);
    };

    it('swings the bell, pops the badge and rolls the number for a live item only, at most once every 3 s', async () => {
      freshClock();
      await openShell();
      const button = await bell();
      await waitFor(() => expect(button).toHaveAccessibleName('Notifications, 2 unread'));
      await streamOpen();
      expect(swings).toEqual([]);

      push('notification.created', created(liveItem(50), 3, false), 'i50');
      await waitFor(() => expect(button).toHaveAccessibleName('Notifications, 3 unread'));
      expect(swings).toEqual([]);
      expect(button.querySelector('.count-out-up')).toBeNull();

      push('notification.created', created(liveItem(51), 4), 'i51');
      await waitFor(() => expect(button).toHaveAccessibleName('Notifications, 4 unread'));
      await waitFor(() => expect(playing()).toHaveLength(1));
      expect(playing()[0].el).toBe(icon(button));
      expect(button.querySelector('.count')).toHaveClass('badge-pop');
      expect(button.querySelector('.count-out-up')).toHaveTextContent('3');
      expect(button.querySelector('.count-in-up')).toHaveTextContent('4');

      // A second item inside the window: the number rolls again, the badge does not pop and the bell keeps its one swing.
      const swinging = icon(button);
      push('notification.created', created(liveItem(52), 5), 'i52');
      await waitFor(() => expect(button.querySelector('.count-in-up')).toHaveTextContent('5'));
      expect(icon(button)).toBe(swinging);
      expect(swings).toHaveLength(1);
      // A read rolls it down.
      push('notification.read', { ids: [52], all: false, upToId: null, unread: 4 });
      await waitFor(() => expect(button.querySelector('.count-in-down')).toHaveTextContent('4'));
      expect(button).toHaveAccessibleName('Notifications, 4 unread');
    });

    it('pops the badge in from nothing for the first unread', async () => {
      freshClock();
      serveInbox([], 0);
      await openShell();
      const button = await bell();
      await waitFor(() => expect(button).toHaveAccessibleName('Notifications, 0 unread'));
      await streamOpen();
      push('notification.created', created(liveItem(53), 1), 'i53');
      await waitFor(() => expect(button.querySelector('.count')).toHaveClass('badge-in'));
      expect(button.querySelector('.count-out-up')).toBeNull();
    });

    it('plays nothing with reduced motion: the number just changes', async () => {
      freshClock();
      const media = vi.spyOn(window, 'matchMedia').mockImplementation(
        (query: string) =>
          ({
            matches: query.includes('reduced-motion'),
            media: query,
            addEventListener: () => {},
            removeEventListener: () => {},
          }) as unknown as MediaQueryList,
      );
      try {
        await openShell();
        const button = await bell();
        await waitFor(() => expect(button).toHaveAccessibleName('Notifications, 2 unread'));
        await streamOpen();
        push('notification.created', created(liveItem(54), 3), 'i54');
        await waitFor(() => expect(button).toHaveAccessibleName('Notifications, 3 unread'));
        expect(swings).toEqual([]);
        expect(button.querySelector('.badge-pop, .count-out-up, .count-in-up')).toBeNull();
      } finally {
        media.mockRestore();
      }
    });

    it("puts the number in a hidden tab's title, keeps it across a title change, and rings once on return", async () => {
      freshClock();
      await openShell();
      const button = await bell();
      await waitFor(() => expect(button).toHaveAccessibleName('Notifications, 2 unread'));
      await streamOpen();
      act(() => {
        document.title = 'Somewhere · IMEI-HUB';
      });
      setVisibility('hidden');
      await waitFor(() => expect(document.title).toBe('(2) Somewhere · IMEI-HUB'));
      push('notification.created', created(liveItem(55), 3), 'i55');
      await waitFor(() => expect(document.title).toBe('(3) Somewhere · IMEI-HUB'));
      expect(swings).toEqual([]);
      // The shell writes the title of another page: the prefix comes back, once.
      act(() => {
        document.title = 'Orders · IMEI-HUB';
      });
      await waitFor(() => expect(document.title).toBe('(3) Orders · IMEI-HUB'));
      setVisibility('visible');
      expect(document.title).toBe('Orders · IMEI-HUB');
      await waitFor(() => expect(playing()).toHaveLength(1));
      expect(playing()[0].el).toBe(icon(button));
    });

    it('keeps exactly one bell icon after three live arrivals, each one swinging that same icon', async () => {
      freshClock();
      await openShell();
      const button = await bell();
      await waitFor(() => expect(button).toHaveAccessibleName('Notifications, 2 unread'));
      await streamOpen();
      const first = icon(button);
      for (const [index, id] of [56, 57, 58].entries()) {
        // Past the 3 s window, so each arrival rings.
        if (index > 0) vi.setSystemTime(Date.now() + 3_100);
        push('notification.created', created(liveItem(id), 3 + index), `i${id}`);
        await waitFor(() => expect(button).toHaveAccessibleName(`Notifications, ${3 + index} unread`));
        await waitFor(() => expect(swings).toHaveLength(index + 1));
        act(() => swings[index].finish());
      }
      expect(button.querySelectorAll('svg')).toHaveLength(1);
      expect(icon(button)).toBe(first);
      expect(swings.map((swing) => swing.el)).toEqual([first, first, first]);
    });

    describe('the arrival sound', () => {
      beforeEach(() => {
        resetSharedAudioContext();
        FakeAudioContext.made = [];
        window.AudioContext = FakeAudioContext as unknown as typeof AudioContext;
      });
      afterEach(() => {
        delete (window as { AudioContext?: unknown }).AudioContext;
      });

      it('chimes with a ring once a first press unlocked it, never for a count change alone, and not once it is off in the Display menu', async () => {
        freshClock();
        await openShell();
        const button = await bell();
        await waitFor(() => expect(button).toHaveAccessibleName('Notifications, 2 unread'));
        await streamOpen();
        // Before any press the browser would not start audio: the ring swings, the chime plays nothing and makes no context.
        push('notification.created', created(liveItem(60), 3), 'i60');
        await waitFor(() => expect(swings).toHaveLength(1));
        expect(FakeAudioContext.made).toEqual([]);

        fireEvent.pointerDown(document.body);
        expect(FakeAudioContext.made).toHaveLength(1);
        const [context] = FakeAudioContext.made;
        await waitFor(() => expect(context.state).toBe('running'));
        // A count that changes without a live item (a poll, a resync) is silent.
        push('unread.changed', { unread: 7 });
        await waitFor(() => expect(button).toHaveAccessibleName('Notifications, 7 unread'));
        expect(context.notes()).toEqual([]);

        vi.setSystemTime(Date.now() + 3_100);
        push('notification.created', created(liveItem(61), 8), 'i61');
        await waitFor(() => expect(button).toHaveAccessibleName('Notifications, 8 unread'));
        expect(context.notes()).toEqual([880, 1320]);

        const user = userEvent.setup();
        await user.click(screen.getByRole('button', { name: 'Display' }));
        const sound = screen.getByRole('menuitemradio', { name: 'Notification sound' });
        expect(sound).toHaveAttribute('aria-checked', 'true');
        await user.click(sound);
        expect(localStorage.getItem('gsm-notification-sound')).toBe('0');

        vi.setSystemTime(Date.now() + 3_100);
        push('notification.created', created(liveItem(62), 9), 'i62');
        await waitFor(() => expect(button).toHaveAccessibleName('Notifications, 9 unread'));
        await waitFor(() => expect(swings).toHaveLength(3));
        expect(context.notes()).toHaveLength(2);
        expect(FakeAudioContext.made).toHaveLength(1);
      });
    });
  });
});
