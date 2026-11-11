// Tests for the staff bell in the top bar, run inside the real shell against the dev mock API: the badge and its label (99+ at the cap), asking only with a signed-in
// staff member, polling that pauses while the tab is hidden, the panel (newest first, unread marked, "Unread only", Load more), marking read, links and keyboard.
import { act, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { Route } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mockServer } from '@/mocks/node';
import { problem } from '@/mocks/problem';
import { mockMe, renderShell, setupMockApi, signInAs } from '@/test/renderApp';
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
    expect(items).toHaveLength(5);
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

  it('shows an Arabic item right-to-left', async () => {
    const user = userEvent.setup();
    await openShell();
    await user.click(await bell());
    const arabic = await screen.findByText('مرحباً بك في مركز الإشعارات');
    expect(arabic.closest('[dir="rtl"]')).not.toBeNull();
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
