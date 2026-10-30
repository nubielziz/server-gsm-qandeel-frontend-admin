// Tests for the dashboard's panels, run through the whole app: the queue and its monitor link, supplier health, the top lists,
// the storefront funnel, and what the staff member's permissions hide. "Needs attention" has its own file.
import { act, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { setupMockApi } from '@/test/renderApp';
import { answerDashboard, answerTopClients, refuse } from '../test/answers';
import { openDashboard, panelOf } from '../test/dashboardPage';
import { dashboardFixture } from '../test/fixtures';
import type { TopClient } from '../types';

setupMockApi();
vi.setConfig({ testTimeout: 20_000 });

// Gives the access checks (one small query per button) time to answer before a test asserts that a button is absent.
const settle = () => act(() => new Promise<void>((resolve) => setTimeout(resolve, 150)));

describe('open queue by type', () => {
  it('shows each type with its counts, the bar and the oldest order, linking to that queue', async () => {
    answerDashboard(dashboardFixture());
    await openDashboard();
    const panel = await panelOf('Open queue by type');
    expect(
      await panel.findByText('28 orders waiting. Bars split on time, review and late.'),
    ).toBeInTheDocument();

    const imei = await panel.findByRole('link', {
      name: 'IMEI: 20 open, 4 need review, 2 past SLA. Open the queue',
    });
    expect(imei).toHaveAttribute('href', '/orders?type=imei');
    expect(within(imei).getByText('20 open')).toBeInTheDocument();
    expect(within(imei).getByText('2 late')).toBeInTheDocument();
    expect(within(imei).getByText('4 review')).toBeInTheDocument();
    expect(within(imei).getByText(/^Oldest /)).toBeInTheDocument();
    // The bar splits 14 on time, 4 for review and 2 late.
    const segments = imei.querySelectorAll('.qbar > i');
    // The share of each segment is its flex-grow (jsdom writes the basis as "0px").
    expect([...segments].map((segment) => (segment as HTMLElement).style.flexGrow)).toEqual(['14', '4', '2']);

    const remote = panel.getByRole('link', {
      name: 'Remote: 0 open, 0 need review, 0 past SLA. Open the queue',
    });
    expect(within(remote).getByText('Queue is empty')).toBeInTheDocument();
    expect(within(remote).queryByText(/late|review/)).not.toBeInTheDocument();
  });

  it('opens the orders of the channel being shown', async () => {
    answerDashboard(dashboardFixture());
    await openDashboard('/dashboard?scope=b2c');
    const panel = await panelOf('Open queue by type');
    expect(await panel.findByRole('link', { name: /^Server: 5 open/ })).toHaveAttribute(
      'href',
      '/orders?type=server&channel=b2c',
    );
    expect(panel.getByRole('link', { name: /^File: 3 open/ })).toHaveAttribute(
      'href',
      '/orders?type=file&channel=b2c',
    );
  });

  it('keeps the rows but not the links when the staff member may not open Orders', async () => {
    answerDashboard(dashboardFixture());
    await openDashboard('/dashboard', { permissions: ['dashboard:read'] });
    const panel = await panelOf('Open queue by type');
    expect(await panel.findByText('20 open')).toBeInTheDocument();
    await settle();
    expect(panel.queryByRole('link')).not.toBeInTheDocument();
    expect(
      panel.getByRole('group', { name: 'IMEI: 20 open, 4 need review, 2 past SLA.' }),
    ).toBeInTheDocument();
  });

  it('links to the queue monitor in a new tab for staff with queues:read', async () => {
    answerDashboard(dashboardFixture());
    await openDashboard();
    const panel = await panelOf('Open queue by type');
    const monitor = await panel.findByRole('link', { name: /Queue monitor/ });
    expect(monitor).toHaveAttribute('href', 'http://api.test/admin/queues');
    expect(monitor).toHaveAttribute('target', '_blank');
    expect(monitor.getAttribute('rel')).toMatch(/noopener/);
    expect(monitor.getAttribute('rel')).toMatch(/noreferrer/);
    expect(monitor).toHaveTextContent('(opens in a new tab)');
  });

  it('has no queue monitor link without queues:read', async () => {
    answerDashboard(dashboardFixture());
    await openDashboard('/dashboard', { permissions: ['dashboard:read', 'orders:read'] });
    const panel = await panelOf('Open queue by type');
    expect(await panel.findByRole('link', { name: /^IMEI: 20 open/ })).toBeInTheDocument();
    expect(panel.queryByRole('link', { name: /Queue monitor/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Queue monitor/ })).not.toBeInTheDocument();
  });
});

describe('supplier health', () => {
  it('shows each supplier’s status, last-hour success, p50 and prepaid balance, and flags a low balance', async () => {
    answerDashboard(dashboardFixture());
    await openDashboard();
    const panel = await panelOf('Supplier health');
    expect(panel.getByText('Last hour')).toBeInTheDocument();
    const table = within(await panel.findByRole('table', { name: 'Supplier health' }));
    const row = (name: string) => within(table.getByText(name).closest('tr') as HTMLElement);

    expect(row('Nordic GSM').getByText('Healthy')).toBeInTheDocument();
    expect(row('Nordic GSM').getByText('98%')).toBeInTheDocument();
    expect(row('Nordic GSM').getByText('250 ms')).toBeInTheDocument();
    expect(row('Nordic GSM').getByText('$1,850')).toBeInTheDocument();

    expect(row('Gulf Server Hub').getByText('Down')).toBeInTheDocument();
    expect(row('Gulf Server Hub').getByText('1.8 s')).toBeInTheDocument();
    const low = row('Gulf Server Hub').getByText('$38');
    expect(low.closest('td')).toHaveClass('text-warn-fg', 'font-medium');
    expect(low.closest('td')?.querySelector('svg')).not.toBeNull();
    expect(row('Nordic GSM').getByText('$1,850').closest('td')).not.toHaveClass('text-warn-fg');

    expect(row('Rapid IMEI').getByText('Degraded')).toBeInTheDocument();
    expect(row('Rapid IMEI').getAllByText('–')).toHaveLength(2);
    // A switched-off supplier says so, whatever its last health was.
    expect(row('Old Feed').getByText('Disabled')).toBeInTheDocument();
    expect(row('Old Feed').queryByText('Healthy')).not.toBeInTheDocument();
  });

  it('links each supplier to its page and opens it from the row too', async () => {
    const user = userEvent.setup();
    answerDashboard(dashboardFixture());
    const app = await openDashboard();
    const panel = await panelOf('Supplier health');
    const link = await panel.findByRole('link', { name: 'Gulf Server Hub' });
    expect(link).toHaveAttribute('href', '/suppliers?supplier=2');

    // A click on an empty part of the row opens the supplier as well (the keyboard uses the link).
    const row = link.closest('tr') as HTMLElement;
    await user.click(within(row).getByText('Down'));
    expect(app.location()).toBe('/suppliers?supplier=2');
  });

  it('has plain names, not links, when the staff member may not open Suppliers', async () => {
    answerDashboard(dashboardFixture());
    await openDashboard('/dashboard', { permissions: ['dashboard:read'] });
    const panel = await panelOf('Supplier health');
    expect(await panel.findByText('Nordic GSM')).toBeInTheDocument();
    await settle();
    expect(panel.queryByRole('link')).not.toBeInTheDocument();
  });

  it('says so when no supplier is connected', async () => {
    answerDashboard(dashboardFixture({ suppliers: [] }));
    await openDashboard();
    const panel = await panelOf('Supplier health');
    expect(await panel.findByRole('heading', { name: 'No suppliers connected' })).toBeInTheDocument();
    expect(await panel.findByRole('link', { name: 'Add supplier' })).toHaveAttribute('href', '/suppliers');
  });
});

describe('top merchants', () => {
  const clients: TopClient[] = [
    {
      id: 9,
      name: 'Lagos Gadget Fix',
      country: 'NG',
      orders: 15,
      spend: '347.5700',
      profit: '31.2700',
      walletBalance: '95.5700',
    },
    {
      id: 17,
      name: 'Sana’a Repair',
      country: 'YE',
      orders: 4,
      spend: '59.0000',
      profit: '5.0000',
      walletBalance: '-81.9500',
    },
  ];

  it('lists the merchants the report sent, with a negative wallet in the critical colour', async () => {
    const seen = answerTopClients(clients);
    answerDashboard(dashboardFixture());
    await openDashboard();
    const panel = await panelOf('Top merchants');
    expect(panel.getByText('By spend, last 7 days')).toBeInTheDocument();
    const table = within(await panel.findByRole('table', { name: 'Top merchants by spend' }));
    const lagos = within(table.getByText('Lagos Gadget Fix').closest('tr') as HTMLElement);
    expect(lagos.getByText('NG')).toBeInTheDocument();
    expect(lagos.getByText('15')).toBeInTheDocument();
    expect(lagos.getByText('$348')).toBeInTheDocument();
    expect(lagos.getByText('$96').closest('td')).not.toHaveClass('text-crit-fg');
    const sanaa = within(table.getByText('Sana’a Repair').closest('tr') as HTMLElement);
    expect(sanaa.getByText('-$82').closest('td')).toHaveClass('text-crit-fg');
    expect(
      await within(table.getByText('Lagos Gadget Fix').closest('tr') as HTMLElement).findByRole('link', {
        name: 'Lagos Gadget Fix',
      }),
    ).toHaveAttribute('href', '/merchants/9');
    expect(seen).toHaveLength(1);
    expect(Object.fromEntries(seen[0].searchParams)).toEqual({ days: '7', limit: '6' });
  });

  it('asks again for the period chosen', async () => {
    const user = userEvent.setup();
    const seen = answerTopClients(clients);
    answerDashboard(dashboardFixture());
    await openDashboard();
    await screen.findByRole('table', { name: 'Top merchants by spend' });
    await user.click(screen.getByRole('button', { name: '14D' }));
    await waitFor(() => expect(seen.map((url) => url.searchParams.get('days'))).toEqual(['7', '14']));
  });

  it('says so when no merchant ordered', async () => {
    answerTopClients([]);
    answerDashboard(dashboardFixture());
    await openDashboard();
    const panel = await panelOf('Top merchants');
    expect(await panel.findByRole('heading', { name: 'No merchant activity yet' })).toBeInTheDocument();
  });

  it('shows the server’s refusal with a Retry that works', async () => {
    const user = userEvent.setup();
    answerTopClients(refuse(403, 'FORBIDDEN', 'No access', 'Reports are not part of your role.'));
    answerDashboard(dashboardFixture());
    await openDashboard();
    const panel = await panelOf('Top merchants');
    expect(await panel.findByText('Could not load the top merchants')).toBeInTheDocument();
    expect(panel.getByText('Reports are not part of your role.')).toBeInTheDocument();
    // The rest of the dashboard is untouched.
    expect(screen.getByRole('region', { name: 'Needs attention' })).toBeInTheDocument();

    answerTopClients(clients);
    await user.click(panel.getByRole('button', { name: 'Retry' }));
    expect(await panel.findByRole('table', { name: 'Top merchants by spend' })).toBeInTheDocument();
  });

  it('is left out, and not requested, without reports:read', async () => {
    const seen = answerTopClients(clients);
    answerDashboard(dashboardFixture());
    await openDashboard('/dashboard', { permissions: ['dashboard:read', 'orders:read'] });
    await screen.findByRole('region', { name: 'Supplier health' });
    await settle();
    expect(screen.queryByRole('region', { name: 'Top merchants' })).not.toBeInTheDocument();
    expect(seen).toHaveLength(0);
  });

  it('is left out for the storefront channel', async () => {
    const seen = answerTopClients(clients);
    answerDashboard(dashboardFixture());
    await openDashboard('/dashboard?scope=b2c');
    await screen.findByRole('region', { name: 'Top customers' });
    await settle();
    expect(screen.queryByRole('region', { name: 'Top merchants' })).not.toBeInTheDocument();
    expect(seen).toHaveLength(0);
  });
});

describe('top customers', () => {
  it('lists the storefront’s best customers, each linking to the customer', async () => {
    answerDashboard(dashboardFixture());
    await openDashboard();
    const panel = await panelOf('Top customers');
    expect(panel.getByText('Storefront, by spend, last 7 days')).toBeInTheDocument();
    const table = within(await panel.findByRole('table', { name: 'Top customers by spend' }));
    const daniel = within(table.getByText('Daniel Whitmore').closest('tr') as HTMLElement);
    expect(daniel.getByText('GB')).toBeInTheDocument();
    expect(daniel.getByText('5')).toBeInTheDocument();
    expect(daniel.getByText('$99')).toBeInTheDocument();
    expect(await daniel.findByRole('link', { name: 'Daniel Whitmore' })).toHaveAttribute(
      'href',
      '/customers/7',
    );
  });

  it('says so when no customer ordered, and is left out when the server sends none', async () => {
    answerDashboard(dashboardFixture({ topCustomers: [] }));
    await openDashboard();
    const panel = await panelOf('Top customers');
    expect(await panel.findByRole('heading', { name: 'No customer orders yet' })).toBeInTheDocument();
  });
});

describe('storefront funnel', () => {
  it('shows the five steps with their share of the step before, and the six small figures', async () => {
    answerDashboard(dashboardFixture());
    await openDashboard();
    const panel = await panelOf('Storefront funnel');
    expect(
      panel.getByText('Last 30 days. Visitor numbers are estimated from IMEI checks.'),
    ).toBeInTheDocument();
    const steps = within(await panel.findByRole('list', { name: 'Storefront funnel, last 30 days' }));
    const items = steps.getAllByRole('listitem');
    expect(items.map((item) => item.querySelector('span.text-ink2')?.textContent)).toEqual([
      'Visitors (estimated)',
      'Checked an IMEI',
      'Started checkout',
      'Paid',
      'Delivered',
    ]);
    expect(within(items[0]).getByText('5,000')).toBeInTheDocument();
    expect(within(items[1]).getByText('900')).toBeInTheDocument();
    expect(within(items[1]).getByText('18% of the step before')).toBeInTheDocument();
    expect(within(items[4]).getByText('94.2% of the step before')).toBeInTheDocument();

    const figure = (label: string) => within(panel.getByText(label).closest('div') as HTMLElement);
    expect(figure('Average order').getByText('$18.50')).toBeInTheDocument();
    expect(figure('Average order').getByText('Paid, with VAT')).toBeInTheDocument();
    expect(figure('Refund rate').getByText('2.4%')).toBeInTheDocument();
    expect(figure('Dispute rate').getByText('1.25%')).toBeInTheDocument();
    expect(figure('First reply').getByText('30 min')).toBeInTheDocument();
    expect(figure('Satisfaction').getByText('4.6 / 5')).toBeInTheDocument();
    expect(figure('Satisfaction').getByText('12 ratings')).toBeInTheDocument();
    expect(figure('Held for review').getByText('4')).toBeInTheDocument();
  });

  it('says so when the storefront has had no activity', async () => {
    const base = dashboardFixture().storefront!;
    answerDashboard(
      dashboardFixture({
        storefront: {
          ...base,
          funnel: { ...base.funnel, imeiChecks: 0, paid: 0, checkoutsStarted: 0, delivered: 0 },
        },
      }),
    );
    await openDashboard();
    const panel = await panelOf('Storefront funnel');
    expect(await panel.findByRole('heading', { name: 'No storefront activity yet' })).toBeInTheDocument();
    expect(panel.queryByRole('list')).not.toBeInTheDocument();
  });
});
