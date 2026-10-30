// Tests for the support inbox, run through the whole app against the dev mock API: the figures, the list and its order, each filter
// kept in the address (including a customer's tickets and the overdue link), search, the open thread, and the empty and error states.
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import { mockServer } from '@/mocks/node';
import { problem } from '@/mocks/problem';
import { setupMockApi } from '@/test/renderApp';
import {
  figures,
  openSupport,
  pressed,
  subjects,
  threadTitle,
  ticketRow,
  waitForSubjects,
} from '../test/supportPage';

setupMockApi();
// The page is a lazy chunk: the first test of a run waits for its modules to load, which is slow while the whole suite runs in
// parallel. Every flow here also goes through the mock API, so give them room.
vi.setConfig({ testTimeout: 20_000 });

// The seed (the demo's 15 tickets): 10 are not resolved, 4 of those are new, 4 are past their reply target, 5 are resolved.
const OPEN_ORDER = [
  'Phone still locked after unlock (SF-20471)', // late, newest first among the late ones
  'Order SF-20487 is taking longer than expected',
  'Chargeback warning from my bank',
  'Refund request for SF-20418',
  'Rapid IMEI orders replying slowly today',
  'Is an iPhone 12 from AT&T eligible?',
  'Where is my result? SF-20472',
  'Deposit PAY-1037 not showing in the wallet',
  'Do you unlock Vodafone UK Pixel phones?',
  'Charged twice for SF-20442',
];
const LATE_ORDER = OPEN_ORDER.slice(0, 4);

describe('the figures', () => {
  it('counts the open tickets, the ones nobody answered, the late ones and the resolved ones', async () => {
    await openSupport();
    await waitFor(() => expect(figures().getByText('Open tickets').parentElement).toHaveTextContent('10'));
    const strip = figures();
    expect(strip.getByText('4 new, not yet answered')).toBeInTheDocument();
    expect(strip.getByText('Past reply target').parentElement).toHaveTextContent('4');
    expect(strip.getByText('Resolved').parentElement).toHaveTextContent('5');
  });
});

describe('the list', () => {
  it('opens on the open tickets, the ones past their reply target first', async () => {
    const app = await openSupport();
    await waitForSubjects(OPEN_ORDER);
    expect(pressed('Ticket filter')).toEqual(['Open']);
    expect(pressed('Who wrote')).toEqual(['All']);
    expect(app.location()).toBe('/support');
  });

  it('shows who wrote, the merchant tag, the badges and how long a reply is overdue', async () => {
    await openSupport();
    const late = await ticketRow('Phone still locked after unlock (SF-20471)');
    expect(late.getByText('Victor Silva')).toBeInTheDocument();
    expect(late.getByText('T-4202')).toBeInTheDocument();
    expect(late.getByText('Open')).toBeInTheDocument();
    expect(late.getByText('High')).toBeInTheDocument();
    expect(late.getByText(/^Reply overdue by /)).toBeInTheDocument();
    const merchant = await ticketRow('Rapid IMEI orders replying slowly today');
    expect(merchant.getByText('Merchant')).toBeInTheDocument();
    expect(merchant.getByText('New')).toBeInTheDocument();
    expect(merchant.queryByText(/Reply overdue/)).not.toBeInTheDocument();
  });

  it('shows the first ticket in the thread when none is chosen', async () => {
    await openSupport();
    expect(await threadTitle('Phone still locked after unlock (SF-20471)')).toBeInTheDocument();
    const first = await ticketRow('Phone still locked after unlock (SF-20471)');
    expect(first.getByText('Victor Silva').closest('button')).toHaveAttribute('aria-current', 'true');
  });
});

describe('filters in the address', () => {
  it('keeps Overdue in the address and lists only the late tickets', async () => {
    const user = userEvent.setup();
    const app = await openSupport();
    await waitForSubjects(OPEN_ORDER);
    await user.click(within(screen.getByRole('group', { name: 'Ticket filter' })).getByText('Overdue'));
    expect(app.location()).toBe('/support?filter=late');
    await waitForSubjects(LATE_ORDER);
  });

  it('honours /support?filter=late', async () => {
    await openSupport('/support?filter=late');
    await waitForSubjects(LATE_ORDER);
    expect(pressed('Ticket filter')).toEqual(['Overdue']);
  });

  it('lists the tickets assigned to me under Mine, resolved ones included', async () => {
    await openSupport('/support?filter=mine');
    await waitForSubjects(['Chargeback warning from my bank', 'API returns 429 for bulk orders']);
  });

  it('lists the resolved tickets under Resolved, most recent first', async () => {
    await openSupport('/support?filter=resolved');
    await waitForSubjects([
      'Order SF-20427 was rejected',
      'VAT invoice for SF-20421',
      'Wrong IMEI on SF-20477',
      'API returns 429 for bulk orders',
      'How do I enter the unlock code?',
    ]);
  });

  it('lists every ticket under All', async () => {
    const user = userEvent.setup();
    const app = await openSupport();
    await user.click(within(screen.getByRole('group', { name: 'Ticket filter' })).getByText('All'));
    expect(app.location()).toBe('/support?filter=all');
    await waitFor(async () => expect(await subjects()).toHaveLength(15));
  });

  it('separates customers from merchants', async () => {
    const user = userEvent.setup();
    const app = await openSupport('/support?filter=all');
    await user.click(within(screen.getByRole('group', { name: 'Who wrote' })).getByText('Merchants'));
    expect(app.location()).toBe('/support?filter=all&who=merchants');
    await waitForSubjects([
      'Rapid IMEI orders replying slowly today',
      'Deposit PAY-1037 not showing in the wallet',
      'API returns 429 for bulk orders',
    ]);
    await user.click(within(screen.getByRole('group', { name: 'Who wrote' })).getByText('Customers'));
    await waitFor(async () => expect(await subjects()).toHaveLength(12));
  });

  it('searches by ticket number, subject and name, after a pause', async () => {
    const user = userEvent.setup();
    const app = await openSupport();
    await user.type(screen.getByRole('searchbox', { name: 'Search ticket, customer, subject' }), 'jessica');
    await waitFor(() => expect(app.location()).toBe('/support?q=jessica'));
    await waitForSubjects([
      'Order SF-20487 is taking longer than expected',
      'Is an iPhone 12 from AT&T eligible?',
    ]);
  });

  it('shows one customer’s tickets with a removable chip, on All', async () => {
    const user = userEvent.setup();
    const app = await openSupport('/support?customerId=28');
    await waitForSubjects(['Phone still locked after unlock (SF-20471)', 'Charged twice for SF-20442']);
    expect(pressed('Ticket filter')).toEqual(['All']);
    expect(screen.getByText(/Customer: Victor Silva/)).toBeInTheDocument();
    expect(screen.queryByRole('group', { name: 'Who wrote' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Remove the customer filter' }));
    expect(app.location()).toBe('/support?filter=all');
    await waitFor(async () => expect(await subjects()).toHaveLength(15));
    expect(screen.queryByText(/Customer: /)).not.toBeInTheDocument();
  });

  it('ignores an address it cannot read', async () => {
    await openSupport('/support?filter=nonsense&who=nobody&customerId=abc&ticket=x&page=0');
    await waitForSubjects(OPEN_ORDER);
  });
});

describe('the open thread', () => {
  it('opens the clicked ticket and keeps it in the address', async () => {
    const user = userEvent.setup();
    const app = await openSupport();
    await user.click((await ticketRow('Chargeback warning from my bank')).getByText('Jack Turner'));
    expect(app.location()).toBe('/support?ticket=4212');
    expect(await threadTitle('Chargeback warning from my bank')).toBeInTheDocument();
    expect(
      (await ticketRow('Chargeback warning from my bank')).getByText('Jack Turner').closest('button'),
    ).toHaveAttribute('aria-current', 'true');
  });

  it('opens the ticket named in the address even when the list filter hides it', async () => {
    await openSupport('/support?ticket=4205');
    expect(await threadTitle('How do I enter the unlock code?')).toBeInTheDocument();
    expect(await subjects()).not.toContain('How do I enter the unlock code?');
  });

  it('drops the open ticket when a filter changes, so the list’s first ticket shows', async () => {
    const user = userEvent.setup();
    const app = await openSupport('/support?ticket=4212');
    await threadTitle('Chargeback warning from my bank');
    await user.click(within(screen.getByRole('group', { name: 'Ticket filter' })).getByText('Overdue'));
    expect(app.location()).toBe('/support?filter=late');
    expect(await threadTitle('Phone still locked after unlock (SF-20471)')).toBeInTheDocument();
  });

  it('goes back to the list with the back button', async () => {
    const user = userEvent.setup();
    const app = await openSupport('/support?ticket=4212');
    await threadTitle('Chargeback warning from my bank');
    await user.click(screen.getByRole('button', { name: 'Back to the list' }));
    expect(app.location()).toBe('/support');
  });

  it('says so when no ticket has that id', async () => {
    await openSupport('/support?ticket=9999');
    expect(await screen.findByText('Ticket not found', {}, { timeout: 10_000 })).toBeInTheDocument();
  });

  it('shows the server’s error with a Retry button when the ticket cannot load', async () => {
    const user = userEvent.setup();
    mockServer.use(
      http.get('*/admin/support-tickets/:id', () =>
        problem(503, 'UNAVAILABLE', 'Service unavailable', 'Try again soon.'),
      ),
    );
    await openSupport('/support?ticket=4212');
    expect(await screen.findByText('Could not load the ticket', {}, { timeout: 5_000 })).toBeInTheDocument();
    mockServer.resetHandlers();
    await user.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await threadTitle('Chargeback warning from my bank')).toBeInTheDocument();
  });
});

describe('empty and error states', () => {
  it('says nothing matches a search, with a way back to the open tickets', async () => {
    const user = userEvent.setup();
    await openSupport('/support?q=zzzz');
    expect(await screen.findByText('No tickets here', {}, { timeout: 10_000 })).toBeInTheDocument();
    expect(screen.getByText('Select a ticket')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Show open tickets' }));
    await waitForSubjects(OPEN_ORDER);
  });

  it('says the inbox is empty when there is no ticket at all', async () => {
    mockServer.use(
      http.get('*/admin/support-tickets', () =>
        HttpResponse.json([], {
          headers: { 'x-total-count': '0', 'access-control-expose-headers': 'x-total-count' },
        }),
      ),
    );
    await openSupport();
    expect(await screen.findByText('Inbox is empty', {}, { timeout: 10_000 })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Show open tickets' })).not.toBeInTheDocument();
  });

  it('shows the server’s error with a Retry button when the list cannot load', async () => {
    const user = userEvent.setup();
    mockServer.use(
      http.get('*/admin/support-tickets', () =>
        problem(503, 'UNAVAILABLE', 'Service unavailable', 'Try again soon.'),
      ),
    );
    await openSupport();
    expect(await screen.findByText('Could not load the tickets', {}, { timeout: 5_000 })).toBeInTheDocument();
    mockServer.resetHandlers();
    await user.click(screen.getByRole('button', { name: 'Retry' }));
    await waitForSubjects(OPEN_ORDER);
  });
});

describe('paging and focus', () => {
  // A long inbox: 60 tickets, served by the row range the page asks for.
  function longInbox() {
    const ranges: string[] = [];
    mockServer.use(
      http.get('*/admin/support-tickets', ({ request }) => {
        const params = new URL(request.url).searchParams;
        const start = Number(params.get('_start') ?? 0);
        const end = Number(params.get('_end') ?? 60);
        ranges.push(`${start}-${end}`);
        const rows = Array.from({ length: 60 }, (_, i) => ({
          id: i + 1,
          number: `T-${i + 1}`,
          subject: `Ticket ${i + 1}`,
          status: 'open',
          priority: 'normal',
          requesterType: 'customer',
          requester: { name: 'Pat Example', email: null },
          late: false,
          slaDueAt: null,
          lastPublicAt: null,
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        })).slice(start, end);
        return HttpResponse.json(rows, {
          headers: { 'x-total-count': '60', 'access-control-expose-headers': 'x-total-count' },
        });
      }),
    );
    return ranges;
  }

  it('pages a long inbox through the address', async () => {
    const user = userEvent.setup();
    const ranges = longInbox();
    const app = await openSupport();
    await waitFor(async () => expect(await subjects()).toHaveLength(25));
    expect(screen.getByText('1–25 of 60')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Next page' }));
    expect(app.location()).toBe('/support?page=2');
    await waitFor(async () => expect((await subjects())[0]).toBe('Ticket 26'));
    expect(ranges).toContain('25-50');
  });

  it('moves a page that is past the end back to the last page', async () => {
    longInbox();
    const app = await openSupport('/support?page=9');
    await waitFor(() => expect(app.location()).toBe('/support?page=3'));
    await waitFor(async () => expect((await subjects())[0]).toBe('Ticket 51'));
  });

  it('puts the cursor in the reply box when a ticket is chosen on a wide screen, and not on a phone', async () => {
    const user = userEvent.setup();
    // The theme provider also listens to media queries, so the stand-in has the listener methods.
    const media = (matches: boolean) => (query: string) =>
      ({
        matches,
        media: query,
        addEventListener: () => {},
        removeEventListener: () => {},
        addListener: () => {},
        removeListener: () => {},
      }) as unknown as MediaQueryList;
    const wide = vi.spyOn(window, 'matchMedia').mockImplementation(media(true));
    await openSupport();
    await threadTitle('Phone still locked after unlock (SF-20471)');
    await user.click((await ticketRow('Chargeback warning from my bank')).getByText('Jack Turner'));
    await threadTitle('Chargeback warning from my bank');
    await waitFor(async () => expect(await screen.findByRole('textbox', { name: 'Reply' })).toHaveFocus());

    wide.mockImplementation(media(false));
    await user.click(
      (await ticketRow('Phone still locked after unlock (SF-20471)')).getByText('Victor Silva'),
    );
    await threadTitle('Phone still locked after unlock (SF-20471)');
    expect(await screen.findByRole('textbox', { name: 'Reply' })).not.toHaveFocus();
    wide.mockRestore();
  });
});
