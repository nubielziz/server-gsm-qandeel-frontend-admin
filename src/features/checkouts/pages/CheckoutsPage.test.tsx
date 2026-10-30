// Tests for the checkouts list, run through the whole app against the dev mock API: the filter, search, page and sort kept in the
// address and sent to the server, the consent rule (no button, and the reason, for a customer who did not agree), the empty states
// and what the staff member's permissions disable. The rows are served by the tests so every case is exact; sending and the funnel
// have their own files.
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import { mockServer } from '@/mocks/node';
import { problem } from '@/mocks/problem';
import { setupMockApi } from '@/test/renderApp';
import {
  checkoutRow,
  checkoutsTable,
  filterGroup,
  openCheckouts,
  serveCheckouts,
  serveFunnel,
} from '../test/checkoutsPage';
import { checkout, hoursAgo } from '../test/fixtures';

setupMockApi();
// The page is a lazy chunk: the first test of a run waits for its modules to load, which is slow while the whole suite runs in parallel.
vi.setConfig({ testTimeout: 20_000 });

const READY = checkout({ id: 1, email: 'ra•••@a.example' });
const NO_CONSENT = checkout({ id: 3, email: 'no•••@c.example', marketingConsent: false, canRecover: false });

describe('the filter, search, page and sort', () => {
  it('opens on "Needs a reminder" and asks the server only for the checkouts it can remind, newest first', async () => {
    const asked = serveCheckouts([READY]);
    await openCheckouts();
    await checkoutRow('ra•••@a.example');
    expect(filterGroup().getByRole('button', { name: 'Needs a reminder' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(Object.fromEntries(asked[0].searchParams)).toEqual({
      _start: '0',
      _end: '12',
      _sort: 'createdAt',
      _order: 'desc',
      canRecover: 'true',
    });
    expect(screen.getByText('1 checkout')).toBeInTheDocument();
  });

  it('keeps All in the address, asks for every checkout, and goes back to the default with no filter in the address', async () => {
    const user = userEvent.setup();
    const asked = serveCheckouts([READY, NO_CONSENT]);
    const app = await openCheckouts();
    await user.click(filterGroup().getByRole('button', { name: 'All' }));
    expect(app.location()).toBe('/checkouts?filter=all');
    await waitFor(() => expect(asked.at(-1)?.searchParams.has('canRecover')).toBe(false));
    await user.click(filterGroup().getByRole('button', { name: 'Needs a reminder' }));
    expect(app.location()).toBe('/checkouts');
    await waitFor(() => expect(asked.at(-1)?.searchParams.get('canRecover')).toBe('true'));
  });

  it('opens the filter and the search named in the address', async () => {
    const asked = serveCheckouts([READY]);
    await openCheckouts('/checkouts?filter=all&q=ra');
    await checkoutRow('ra•••@a.example');
    expect(filterGroup().getByRole('button', { name: 'All' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('searchbox', { name: 'Search email' })).toHaveValue('ra');
    expect(asked[0].searchParams.get('q')).toBe('ra');
  });

  it('sends the search after a pause and keeps it in the address', async () => {
    const user = userEvent.setup();
    const asked = serveCheckouts([READY]);
    const app = await openCheckouts();
    await user.type(screen.getByRole('searchbox', { name: 'Search email' }), 'ra');
    await waitFor(() => expect(app.location()).toBe('/checkouts?q=ra'));
    await waitFor(() => expect(asked.at(-1)?.searchParams.get('q')).toBe('ra'));
  });

  it('sorts by a column header and pages, both kept in the address', async () => {
    const user = userEvent.setup();
    const rows = Array.from({ length: 12 }, (_, i) => checkout({ id: 100 + i, email: `p${i}•••@x.example` }));
    const asked = serveCheckouts(rows, 30);
    const app = await openCheckouts('/checkouts?filter=all');
    await checkoutRow('p0•••@x.example');
    expect(screen.getByText('1–12 of 30')).toBeInTheDocument();
    await user.click((await checkoutsTable()).getByRole('button', { name: 'Basket' }));
    expect(app.location()).toBe('/checkouts?filter=all&sort=grossAmount&dir=asc');
    await waitFor(() => expect(asked.at(-1)?.searchParams.get('_sort')).toBe('grossAmount'));
    expect(asked.at(-1)?.searchParams.get('_order')).toBe('asc');
    await user.click(screen.getByRole('button', { name: 'Next page' }));
    expect(app.location()).toBe('/checkouts?filter=all&sort=grossAmount&dir=asc&page=2');
    await waitFor(() => expect(asked.at(-1)?.searchParams.get('_start')).toBe('12'));
  });

  it('shows the server error with Retry when the list cannot be loaded', async () => {
    const user = userEvent.setup();
    mockServer.use(
      http.get('*/admin/checkouts/abandoned', () =>
        problem(403, 'FORBIDDEN', 'Not allowed', 'Growth is off.'),
      ),
    );
    await openCheckouts();
    expect(await screen.findByText('Could not load the abandoned checkouts')).toBeInTheDocument();
    expect(screen.getByText('Growth is off.')).toBeInTheDocument();
    serveCheckouts([READY]);
    await user.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByText('ra•••@a.example')).toBeInTheDocument();
  });
});

describe('consent and recovery status', () => {
  const ROWS = [
    READY,
    NO_CONSENT,
    checkout({
      id: 4,
      email: 'se•••@d.example',
      recoveryEmailedAt: hoursAgo(1),
      canRecover: false,
    }),
    checkout({
      id: 5,
      email: 'wo•••@e.example',
      recoveryEmailedAt: hoursAgo(20),
      orderId: 77,
      status: 'paid',
      canRecover: false,
    }),
    checkout({ id: 6, email: 'wa•••@f.example', canRecover: false }),
  ];

  it('offers Remind only for the rows the server says can be reminded', async () => {
    serveCheckouts(ROWS);
    await openCheckouts('/checkouts?filter=all');
    await checkoutRow('ra•••@a.example');
    const buttons = screen.getAllByRole('button', { name: /^Send a reminder to / });
    expect(buttons.map((button) => button.getAttribute('aria-label'))).toEqual([
      'Send a reminder to ra•••@a.example',
    ]);
  });

  it('says why a customer without marketing consent has no button, and shows the other states in words', async () => {
    serveCheckouts(ROWS);
    await openCheckouts('/checkouts?filter=all');
    const noConsent = await checkoutRow('no•••@c.example');
    expect(noConsent.getByText('Not agreed')).toBeInTheDocument();
    expect(noConsent.getByText('Will not be reminded')).toBeInTheDocument();
    expect(noConsent.getByText('No marketing consent, so no email.')).toBeInTheDocument();
    expect(noConsent.queryByRole('button')).not.toBeInTheDocument();

    const ready = await checkoutRow('ra•••@a.example');
    expect(ready.getByText('Agreed')).toBeInTheDocument();
    expect(ready.getByText('Not reminded')).toBeInTheDocument();

    const sent = await checkoutRow('se•••@d.example');
    expect(sent.getByText('Reminder sent')).toBeInTheDocument();
    expect(sent.getByText('Emailed 1h ago')).toBeInTheDocument();
    expect((await checkoutRow('wo•••@e.example')).getByText('Recovered')).toBeInTheDocument();
    expect((await checkoutRow('wa•••@f.example')).getByText('Reminder due')).toBeInTheDocument();
  });

  it('shows the basket in the customer currency, the service and where the customer came from', async () => {
    serveCheckouts([checkout({ id: 9, email: 'zz•••@z.example', utm: { source: 'Blog' } })]);
    await openCheckouts();
    const row = await checkoutRow('zz•••@z.example');
    expect(row.getByText('£11.99')).toBeInTheDocument();
    expect(row.getByText('iCloud Clean / Lost Check')).toBeInTheDocument();
    expect(row.getByText('Blog')).toBeInTheDocument();
    expect(row.getByText('2h ago')).toBeInTheDocument();
  });

  it('shows the address exactly as the server masked it', async () => {
    serveCheckouts([checkout({ id: 9, email: 'z***@z.example' })]);
    await openCheckouts();
    expect(await screen.findByText('z***@z.example')).toBeInTheDocument();
  });
});

describe('empty states', () => {
  it('says everyone has been reminded and offers all checkouts', async () => {
    const user = userEvent.setup();
    const asked = serveCheckouts([]);
    const app = await openCheckouts();
    expect(await screen.findByText('Everyone has been reminded')).toBeInTheDocument();
    expect(screen.getByText('Nobody is waiting for a reminder.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Show all checkouts' }));
    expect(app.location()).toBe('/checkouts?filter=all');
    await waitFor(() => expect(asked.at(-1)?.searchParams.has('canRecover')).toBe(false));
  });

  it('says nothing matches a search and clears it', async () => {
    const user = userEvent.setup();
    serveCheckouts([]);
    const app = await openCheckouts('/checkouts?filter=all&q=zzz');
    expect(await screen.findByText('No checkouts match this search')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Clear search' }));
    expect(app.location()).toBe('/checkouts?filter=all');
  });

  it('says there are no abandoned checkouts on an empty All', async () => {
    serveCheckouts([]);
    await openCheckouts('/checkouts?filter=all');
    expect(await screen.findByText('No abandoned checkouts')).toBeInTheDocument();
  });
});

describe('permissions', () => {
  it('disables Remind and Send reminder without growth:send, naming the missing permission, and hides the funnel without reports:growth', async () => {
    const user = userEvent.setup();
    serveCheckouts([READY]);
    const funnelAsked = serveFunnel({ days: 30, imeiChecks: 1, paymentStarted: 1, paid: 1, delivered: 1 });
    await openCheckouts('/checkouts', { permissions: ['growth:read'] });
    const remind = await screen.findByRole('button', { name: 'Send a reminder to ra•••@a.example' });
    expect(remind).toBeDisabled();
    expect(remind).toHaveAttribute('title', 'You need the growth:send permission');
    await user.click(screen.getByRole('checkbox', { name: 'Select row 1' }));
    const send = screen.getByRole('button', { name: 'Send reminder' });
    expect(send).toBeDisabled();
    expect(send).toHaveAttribute('title', 'You need the growth:send permission');
    expect(screen.queryByRole('heading', { name: 'Sales funnel' })).not.toBeInTheDocument();
    expect(funnelAsked).toHaveLength(0);
  });

  it('enables sending and shows the funnel with growth:send and reports:growth', async () => {
    serveCheckouts([READY]);
    serveFunnel({ days: 30, imeiChecks: 1, paymentStarted: 1, paid: 1, delivered: 1 });
    await openCheckouts('/checkouts', { permissions: ['growth:read', 'growth:send', 'reports:growth'] });
    expect(await screen.findByRole('button', { name: 'Send a reminder to ra•••@a.example' })).toBeEnabled();
    expect(await screen.findByRole('heading', { name: 'Sales funnel' })).toBeInTheDocument();
  });
});
