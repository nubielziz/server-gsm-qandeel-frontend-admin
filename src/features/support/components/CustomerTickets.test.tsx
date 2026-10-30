// Tests for CustomerTickets, the list the customer page embeds: it is rendered inside the real app shell against the dev mock API, in a
// small route of its own, the way the customer page would use it. Covers the rows, the links into the inbox, the empty, error and
// no-permission states.
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { Route } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import { mockServer } from '@/mocks/node';
import { problem } from '@/mocks/problem';
import { mockMe, renderShell, setupMockApi, signInAs } from '@/test/renderApp';
import { CustomerTickets } from './CustomerTickets';

setupMockApi();
vi.setConfig({ testTimeout: 20_000 });

// Customers of the demo seed: c28 Victor Silva has two tickets, c8 Marco Ricci one, c1 none.
async function show(customerId: number, permissions?: string[]) {
  await signInAs();
  if (permissions) mockMe({ id: 1, name: 'Rami K.', permissions });
  return renderShell('/probe', <Route path="/probe" element={<CustomerTickets customerId={customerId} />} />);
}

const list = () => screen.findByRole('list', { name: 'Tickets' }, { timeout: 10_000 });

describe('CustomerTickets', () => {
  it('lists the customer’s tickets, newest activity first, with status and age', async () => {
    await show(28);
    const tickets = within(await list());
    const rows = tickets.getAllByRole('link');
    expect(rows.map((row) => row.querySelector('span')?.textContent)).toEqual([
      'Phone still locked after unlock (SF-20471)',
      'Charged twice for SF-20442',
    ]);
    expect(within(rows[0]).getByText('Open')).toBeInTheDocument();
    expect(within(rows[1]).getByText('Waiting on customer')).toBeInTheDocument();
    expect(within(rows[0]).getByText(/ago$/)).toBeInTheDocument();
    expect(screen.getByText('2 tickets.')).toBeInTheDocument();
  });

  it('opens a ticket’s thread in the inbox', async () => {
    const user = userEvent.setup();
    const app = await show(28);
    const link = await screen.findByRole('link', { name: /Charged twice for SF-20442/ });
    expect(link).toHaveAttribute('href', '/support?ticket=4206');
    await user.click(link);
    expect(app.location()).toBe('/support?ticket=4206');
  });

  it('links to the customer’s tickets in the inbox', async () => {
    await show(28);
    expect(await screen.findByRole('link', { name: 'Open in Support' })).toHaveAttribute(
      'href',
      '/support?customerId=28',
    );
  });

  it('says a customer has no tickets', async () => {
    await show(1);
    expect(await screen.findByText('No tickets', {}, { timeout: 10_000 })).toBeInTheDocument();
    expect(screen.getByText('This customer has never contacted support.')).toBeInTheDocument();
  });

  it('asks the list for this customer’s tickets only, newest activity first', async () => {
    const urls: URL[] = [];
    mockServer.use(
      http.get('*/admin/support-tickets', ({ request }) => {
        urls.push(new URL(request.url));
        return undefined;
      }),
    );
    await show(28);
    await list();
    const params = urls[0].searchParams;
    expect(params.get('requesterType')).toBe('customer');
    expect(params.get('requesterId')).toBe('28');
    expect(params.get('_sort')).toBe('updatedAt');
    expect(params.get('_order')).toBe('desc');
  });

  it('says how many more there are than it shows', async () => {
    const row = (id: number) => ({
      id,
      number: `T-${id}`,
      subject: `Ticket ${id}`,
      status: 'open',
      updatedAt: '2026-01-01T00:00:00.000Z',
    });
    mockServer.use(
      http.get('*/admin/support-tickets', () =>
        HttpResponse.json(
          Array.from({ length: 10 }, (_, i) => row(i + 1)),
          {
            headers: { 'x-total-count': '14', 'access-control-expose-headers': 'x-total-count' },
          },
        ),
      ),
    );
    await show(28);
    expect(await screen.findByText('Showing the latest 10 of 14 tickets.')).toBeInTheDocument();
  });

  it('shows the server’s error with a Retry button', async () => {
    const user = userEvent.setup();
    mockServer.use(
      http.get('*/admin/support-tickets', () =>
        problem(503, 'UNAVAILABLE', 'Service unavailable', 'Try again soon.'),
      ),
    );
    await show(28);
    expect(await screen.findByText('Could not load the tickets', {}, { timeout: 5_000 })).toBeInTheDocument();
    mockServer.resetHandlers();
    await user.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await list()).toBeInTheDocument();
  });

  it('says why the tickets are hidden without support:read, and asks nothing', async () => {
    const urls: string[] = [];
    mockServer.use(
      http.get('*/admin/support-tickets', ({ request }) => {
        urls.push(request.url);
        return undefined;
      }),
    );
    await show(28, ['customers:read']);
    expect(await screen.findByText('Tickets are hidden', {}, { timeout: 10_000 })).toBeInTheDocument();
    expect(screen.getByText(/support:read permission/)).toBeInTheDocument();
    expect(urls).toEqual([]);
  });
});
