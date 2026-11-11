// Tests for the Notifications list, run through the whole app against the dev mock API: the seeded campaigns, the filters and search kept in the address and
// sent to the server, opening a campaign, "New campaign" and what the staff member's permissions show, and the empty and error states.
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import { mockServer } from '@/mocks/node';
import { problem } from '@/mocks/problem';
import { mockMe, renderApp, setupMockApi, signInAs } from '@/test/renderApp';
import { campaign } from '../test/fixtures';
import { campaignRow, campaignsTable, openNotifications, serveCampaigns } from '../test/notificationsPage';

setupMockApi();
// The page is a lazy chunk: the first test of a run waits for its modules to load, which is slow while the whole suite runs in parallel.
vi.setConfig({ testTimeout: 20_000 });

describe('the list', () => {
  it('shows the three seeded campaigns with purpose, channels, status, recipients and who created them', async () => {
    await openNotifications();
    const sent = await campaignRow('Scheduled maintenance on Friday');
    expect(sent.getByText('Service announcement')).toBeInTheDocument();
    expect(sent.getByText('Sent', { selector: 'span span' })).toBeInTheDocument();
    expect(sent.getByText('In-app')).toBeInTheDocument();
    expect(sent.getByText('Email')).toBeInTheDocument();
    expect(sent.getByText('Rami K.')).toBeInTheDocument();
    expect((await campaignRow('Ramadan offer')).getByText('Marketing')).toBeInTheDocument();
    expect((await campaignRow('Ramadan offer')).getByText('Scheduled')).toBeInTheDocument();
    expect((await campaignRow('New unlock services')).getByText('Draft')).toBeInTheDocument();
    expect(await screen.findByText('3 campaigns')).toBeInTheDocument();
  });

  it('shows the people a scheduled campaign expects, and a dash for a draft with no count', async () => {
    await openNotifications();
    const scheduled = await campaignRow('Ramadan offer');
    expect(scheduled.getByText(/^\d+$/)).toBeInTheDocument();
    expect((await campaignRow('New unlock services')).getByText('–')).toBeInTheDocument();
  });

  it('opens the campaign from its name and from the row', async () => {
    const user = userEvent.setup();
    const app = await openNotifications();
    await user.click((await campaignRow('Ramadan offer')).getByRole('link', { name: 'Ramadan offer' }));
    // The detail is a lazy chunk, and the router waits for it before it moves.
    await waitFor(() => expect(app.location()).toBe('/notifications/2'), { timeout: 10_000 });
    expect(await screen.findByRole('heading', { level: 1, name: 'Ramadan offer' })).toBeInTheDocument();
  });

  it('opens the campaign when an empty part of its row is clicked', async () => {
    const user = userEvent.setup();
    const app = await openNotifications();
    const row = (await (await campaignsTable()).findByText('New unlock services')).closest(
      'tr',
    ) as HTMLElement;
    await user.click(within(row).getAllByRole('cell')[4]);
    await waitFor(() => expect(app.location()).toBe('/notifications/3'), { timeout: 10_000 });
  });
});

describe('the filters and search', () => {
  it('sends the status and purpose to the server and keeps them in the address', async () => {
    const user = userEvent.setup();
    const asked = serveCampaigns([campaign({ id: 1, name: 'Only one' })]);
    const app = await openNotifications();
    await campaignRow('Only one');
    await user.selectOptions(screen.getByRole('combobox', { name: 'Filter by status' }), 'sent');
    await user.selectOptions(screen.getByRole('combobox', { name: 'Filter by purpose' }), 'marketing');
    expect(app.location()).toBe('/notifications?status=sent&purpose=marketing');
    await waitFor(() => expect(asked.at(-1)?.searchParams.get('purpose')).toBe('marketing'));
    expect(Object.fromEntries(asked.at(-1)?.searchParams ?? [])).toEqual({
      _start: '0',
      _end: '25',
      _sort: 'createdAt',
      _order: 'desc',
      status: 'sent',
      purpose: 'marketing',
    });
  });

  it('searches by name after a pause and goes back to page 1', async () => {
    const user = userEvent.setup();
    const asked = serveCampaigns([campaign({ name: 'Ramadan offer' })]);
    const app = await openNotifications('/notifications?page=1');
    await campaignRow('Ramadan offer');
    await user.type(screen.getByRole('searchbox', { name: 'Search by name' }), 'rama');
    await waitFor(() => expect(asked.at(-1)?.searchParams.get('q')).toBe('rama'));
    expect(app.location()).toBe('/notifications?q=rama');
  });

  it('opens with the filters named in the address, ignores a status that does not exist and clears all with one button', async () => {
    const user = userEvent.setup();
    const app = await openNotifications('/notifications?status=sent&purpose=bogus&q=main');
    await campaignRow('Scheduled maintenance on Friday');
    expect(screen.getByRole('combobox', { name: 'Filter by status' })).toHaveValue('sent');
    expect(screen.getByRole('combobox', { name: 'Filter by purpose' })).toHaveValue('');
    await user.click(screen.getByRole('button', { name: 'Clear filters' }));
    expect(app.location()).toBe('/notifications');
    expect(await screen.findByText('3 campaigns')).toBeInTheDocument();
  });

  it('pages through a long list and keeps the page in the address', async () => {
    const user = userEvent.setup();
    const rows = Array.from({ length: 25 }, (_, index) =>
      campaign({ id: index + 1, name: `Campaign ${index + 1}` }),
    );
    const asked = serveCampaigns(rows, 60);
    const app = await openNotifications();
    await campaignRow('Campaign 1');
    await user.click(screen.getByRole('button', { name: 'Next page' }));
    expect(app.location()).toBe('/notifications?page=2');
    await waitFor(() => expect(asked.at(-1)?.searchParams.get('_start')).toBe('25'));
  });
});

describe('what the staff member may do', () => {
  it('shows New campaign with broadcasts:send', async () => {
    await openNotifications();
    expect(screen.getByRole('button', { name: 'New campaign' })).toBeEnabled();
  });

  it('opens with broadcasts:read alone and hides New campaign', async () => {
    await openNotifications('/notifications', { permissions: ['dashboard:read', 'broadcasts:read'] });
    await campaignsTable();
    expect(screen.queryByRole('button', { name: 'New campaign' })).not.toBeInTheDocument();
  });

  it('is not offered to a role without broadcasts:read', async () => {
    await signInAs();
    mockMe({ permissions: ['dashboard:read', 'orders:read'] });
    renderApp('/notifications');
    expect(await screen.findByText('You do not have access to this page')).toBeInTheDocument();
    expect(screen.queryByRole('table', { name: 'Notification campaigns' })).not.toBeInTheDocument();
  });
});

describe('the empty and error states', () => {
  it('says there are no campaigns yet and offers New campaign', async () => {
    serveCampaigns([]);
    await openNotifications();
    expect(await screen.findByText('No campaigns yet')).toBeInTheDocument();
    expect(
      within(screen.getByText('No campaigns yet').closest('.empty') as HTMLElement).getByRole('button', {
        name: 'New campaign',
      }),
    ).toBeInTheDocument();
  });

  it('says nothing matches a filter, and offers to clear it', async () => {
    const user = userEvent.setup();
    const asked = serveCampaigns([]);
    const app = await openNotifications('/notifications?status=failed');
    expect(await screen.findByText('No campaigns match')).toBeInTheDocument();
    await user.click(
      within(screen.getByText('No campaigns match').closest('.empty') as HTMLElement).getByRole('button', {
        name: 'Clear filters',
      }),
    );
    expect(app.location()).toBe('/notifications');
    await waitFor(() => expect(asked.at(-1)?.searchParams.has('status')).toBe(false));
  });

  it('shows the error with Retry, then the list when the retry works', async () => {
    const user = userEvent.setup();
    let fail = true;
    mockServer.use(
      http.get('*/admin/notification-campaigns', () =>
        fail
          ? problem(500, 'INTERNAL', 'Server error', 'Boom.')
          : HttpResponse.json([campaign()], { headers: { 'x-total-count': '1' } }),
      ),
    );
    await openNotifications();
    expect(await screen.findByText('Could not load the campaigns')).toBeInTheDocument();
    fail = false;
    await user.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByText('Winter promo')).toBeInTheDocument();
  });
});
