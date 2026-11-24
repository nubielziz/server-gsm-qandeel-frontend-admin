// Tests for the campaign page, run through the whole app against the dev mock API: the header actions by status and permission, the figures and progress, the
// message preview (and the sandboxed email frame), the audience in words, the timeline, the recipients, the not-found and error states, and the live refresh while
// the campaign is being sent.
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mockServer } from '@/mocks/node';
import { problem } from '@/mocks/problem';
import { setupMockApi } from '@/test/renderApp';
import { campaignDetail } from '../test/fixtures';
import { openNotifications, serveCampaign } from '../test/notificationsPage';
import type { CampaignDetail } from '../types';

setupMockApi();
// The page is a lazy chunk: the first test of a run waits for its modules to load, which is slow while the whole suite runs in parallel.
vi.setConfig({ testTimeout: 20_000 });
afterEach(() => {
  vi.useRealTimers();
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' });
});

const open = (id: number, options: { permissions?: string[] } = {}, name?: string) =>
  openNotifications(`/notifications/${id}`, { ...options, heading: name });

/** The names of the buttons in the page header's action row. */
const actions = () =>
  within(screen.getByRole('heading', { level: 1 }).closest('div')?.parentElement as HTMLElement)
    .queryAllByRole('button')
    .map((button) => button.textContent?.trim());

describe('the header actions', () => {
  it('offers a draft Edit, Send test, Schedule, Send now, Duplicate and Delete', async () => {
    await open(3, {}, 'New unlock services');
    expect(await screen.findByText('Draft')).toBeInTheDocument();
    expect(actions()).toEqual(['Edit', 'Send test', 'Schedule', 'Send now', 'Duplicate', 'Delete']);
  });

  it('offers a scheduled campaign Reschedule and Cancel but no Delete', async () => {
    await open(2, {}, 'Ramadan offer');
    expect(await screen.findAllByText('Scheduled')).not.toHaveLength(0);
    expect(actions()).toEqual([
      'Edit',
      'Send test',
      'Reschedule',
      'Send now',
      'Cancel campaign',
      'Duplicate',
    ]);
  });

  it('offers a sent campaign only Duplicate', async () => {
    await open(1, {}, 'Scheduled maintenance on Friday');
    expect(await screen.findByText('Sent')).toBeInTheDocument();
    expect(actions()).toEqual(['Duplicate']);
  });

  it('offers a sending campaign Cancel and Duplicate', async () => {
    serveCampaign(campaignDetail({ id: 8, name: 'Big send', status: 'sending' }));
    await open(8, {}, 'Big send');
    expect(await screen.findByText('Sending')).toBeInTheDocument();
    expect(actions()).toEqual(['Cancel campaign', 'Duplicate']);
  });

  it('offers no action at all with broadcasts:read alone', async () => {
    await open(3, { permissions: ['dashboard:read', 'broadcasts:read'] }, 'New unlock services');
    expect(await screen.findByText('Draft')).toBeInTheDocument();
    expect(actions()).toEqual([]);
  });
});

describe('the figures', () => {
  const sent = (): CampaignDetail => {
    const detail = campaignDetail({
      id: 9,
      name: 'Counted',
      status: 'sent',
      expectedRecipients: 20,
      recipients: 18,
      planned: { inApp: 18, email: 10 },
      channels: ['in_app', 'email'],
      skipped: { optedOut: 2, noAccount: 1 },
      finishedAt: '2026-11-10T09:30:00.000Z',
    });
    detail.delivery = {
      inApp: { delivered: 18, read: 7 },
      email: { queued: 1, sent: 8, failed: 1 },
    };
    return detail;
  };

  it('shows expected people, recipients and the numbers of each chosen channel', async () => {
    serveCampaign(sent());
    await open(9, {}, 'Counted');
    const grid = within(await screen.findByRole('region', { name: 'Campaign figures' }));
    expect(grid.getByText('Expected').closest('div')).toHaveTextContent('20');
    expect(grid.getByText('Recipients').closest('div')).toHaveTextContent('18');
    expect(grid.getByText('In-app').closest('div')).toHaveTextContent('18 delivered');
    expect(grid.getByText('In-app').closest('div')).toHaveTextContent('7 read');
    expect(grid.getByText('Email').closest('div')).toHaveTextContent('8 sent');
    expect(grid.getByText('Email').closest('div')).toHaveTextContent('1 waiting, 1 failed');
    expect(grid.queryByText('Telegram')).not.toBeInTheDocument();
  });

  it('leaves out the channels the campaign does not use and shows how far the delivery is', async () => {
    const detail = sent();
    detail.channels = ['in_app'];
    serveCampaign(detail);
    await open(9, {}, 'Counted');
    const grid = within(await screen.findByRole('region', { name: 'Campaign figures' }));
    expect(grid.queryByText('Email')).not.toBeInTheDocument();
    // 18 + 8 + 1 of 28 planned.
    expect(await screen.findByText('27 of 28 messages done')).toBeInTheDocument();
    expect(screen.getByRole('meter', { name: 'Delivery progress' })).toHaveAttribute('aria-valuenow', '96');
  });

  it('says why people were skipped, and shows the failure reason of a failed campaign', async () => {
    serveCampaign({
      ...sent(),
      status: 'failed',
      error: 'The fan-out stopped: the audience no longer parses.',
    });
    await open(9, {}, 'Counted');
    expect(await screen.findByText(/The fan-out stopped/)).toBeInTheDocument();
    expect(screen.getByText('2 people have switched announcement emails off')).toBeInTheDocument();
    expect(screen.getByText('1 guest has no login, so no inbox item')).toBeInTheDocument();
  });
});

describe('the audience, the timeline and the log link', () => {
  it('describes the audience in words and lists the story of the campaign', async () => {
    await open(1, {}, 'Scheduled maintenance on Friday');
    const audience = within(await screen.findByRole('region', { name: 'Audience' }));
    expect(audience.getByText('All active staff')).toBeInTheDocument();
    expect(audience.getByText('Active merchants')).toBeInTheDocument();
    expect(audience.getByText('Retail accounts with a login')).toBeInTheDocument();
    const timeline = within(screen.getByRole('region', { name: 'Timeline' }));
    expect(timeline.getByText('Campaign created')).toBeInTheDocument();
    expect(timeline.getByText('Queued for sending')).toBeInTheDocument();
    expect(timeline.getByText('Sending finished')).toBeInTheDocument();
    expect(timeline.getByText('Rami K.')).toBeInTheDocument();
  });

  it('links a sent campaign to its messages in the notification log, and a draft to nothing', async () => {
    await open(1, {}, 'Scheduled maintenance on Friday');
    expect(await screen.findByRole('link', { name: 'Open in the log' })).toHaveAttribute(
      'href',
      '/settings?tab=log&campaignId=1',
    );
  });

  it('has no log link for a draft', async () => {
    await open(3, {}, 'New unlock services');
    await screen.findByText('Draft');
    expect(screen.queryByRole('link', { name: 'Open in the log' })).not.toBeInTheDocument();
  });
});

describe('the message preview', () => {
  it('renders the first channel with the server, and email HTML only inside the sandboxed frame', async () => {
    const user = userEvent.setup();
    await open(1, {}, 'Scheduled maintenance on Friday');
    const panel = within(await screen.findByRole('region', { name: 'Message' }));
    expect(await panel.findByText(/Hello Daniel/)).toBeInTheDocument();
    expect(panel.getByText(/From In-app notification/)).toBeInTheDocument();
    await user.click(panel.getByRole('button', { name: 'Email' }));
    const frame = await panel.findByTitle('Message preview');
    expect(frame).toHaveAttribute('sandbox', '');
    expect(frame.getAttribute('srcdoc')).toContain('Hello Daniel');
  });

  it('has one message with no language tabs, and shows the note the server sends under it', async () => {
    serveCampaign(campaignDetail({ id: 10, name: 'One message' }));
    mockServer.use(
      http.post('*/admin/notification-campaigns/10/preview', () =>
        HttpResponse.json({
          subject: 'Winter promo',
          body: 'Hello Daniel',
          format: 'text',
          from: 'In-app notification',
          note: 'A sample with made-up details.',
        }),
      ),
    );
    await open(10, {}, 'One message');
    const panel = within(await screen.findByRole('region', { name: 'Message' }));
    expect(await panel.findByText('A sample with made-up details.')).toBeInTheDocument();
    expect(panel.queryByRole('tab')).not.toBeInTheDocument();
  });

  it('offers a sample per kind of person when more than one is reached', async () => {
    const user = userEvent.setup();
    await open(1, {}, 'Scheduled maintenance on Friday');
    const panel = within(await screen.findByRole('region', { name: 'Message' }));
    const sample = panel.getByRole('combobox', { name: 'Sample for' });
    expect([...(sample as HTMLSelectElement).options].map((option) => option.value)).toEqual([
      'customer',
      'merchant',
      'staff',
    ]);
    await user.selectOptions(sample, 'staff');
    await waitFor(() => expect(sample).toHaveValue('staff'));
  });
});

describe('the recipients', () => {
  it('lists the first channel, switches channel and filters by status through the server', async () => {
    const user = userEvent.setup();
    const asked: URL[] = [];
    mockServer.events.on('request:start', ({ request }) => {
      if (request.url.includes('/recipients')) asked.push(new URL(request.url));
    });
    await open(1, {}, 'Scheduled maintenance on Friday');
    const table = within(await screen.findByRole('table', { name: 'Campaign recipients' }));
    expect(table.getAllByRole('row').length).toBeGreaterThan(1);
    expect(asked[0].searchParams.get('channel')).toBe('in_app');
    await user.selectOptions(screen.getByRole('combobox', { name: 'Filter recipients by status' }), 'read');
    await waitFor(() => expect(asked.at(-1)?.searchParams.get('status')).toBe('read'));
    await user.click(
      within(screen.getByRole('region', { name: 'Recipients' })).getByRole('button', { name: 'Email' }),
    );
    await waitFor(() => expect(asked.at(-1)?.searchParams.get('channel')).toBe('email'));
    expect(asked.at(-1)?.searchParams.has('status')).toBe(false);
    mockServer.events.removeAllListeners();
  });

  it('says the recipients appear when a draft is sent', async () => {
    await open(3, {}, 'New unlock services');
    expect(await screen.findByText('The recipients appear when the campaign is sent.')).toBeInTheDocument();
  });
});

describe('not found and errors', () => {
  it('says so for an id that does not exist, and for an address that is not a number', async () => {
    await openNotifications('/notifications/999', { heading: 'Campaign' });
    expect(await screen.findByText('Campaign not found')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to notifications' })).toHaveAttribute(
      'href',
      '/notifications',
    );
  });

  it('shows the error with Retry when the read fails', async () => {
    const user = userEvent.setup();
    let fail = true;
    mockServer.use(
      http.get('*/admin/notification-campaigns/3', () =>
        fail
          ? problem(500, 'INTERNAL', 'Server error', 'Boom.')
          : HttpResponse.json(campaignDetail({ id: 3, name: 'Back again' })),
      ),
    );
    await openNotifications('/notifications/3', { heading: 'Campaign' });
    expect(await screen.findByText('Could not load the campaign')).toBeInTheDocument();
    fail = false;
    await user.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByRole('heading', { level: 1, name: 'Back again' })).toBeInTheDocument();
  });

  it('puts the campaign name in the breadcrumb', async () => {
    await open(2, {}, 'Ramadan offer');
    expect(
      await within(screen.getByRole('navigation', { name: /breadcrumb/i })).findByText('Ramadan offer'),
    ).toBeInTheDocument();
  });
});

describe('the live refresh', () => {
  it('asks again every 5 seconds while the campaign is being sent, and stops once it is sent', async () => {
    let reads = 0;
    mockServer.use(
      http.get('*/admin/notification-campaigns/11', () => {
        reads += 1;
        return HttpResponse.json(
          campaignDetail({ id: 11, name: 'Going out', status: reads < 3 ? 'sending' : 'sent' }),
        );
      }),
    );
    vi.useFakeTimers({ shouldAdvanceTime: true });
    await open(11, {}, 'Going out');
    await screen.findByText('Sending');
    expect(reads).toBe(1);
    await vi.advanceTimersByTimeAsync(5_100);
    await waitFor(() => expect(reads).toBe(2));
    await vi.advanceTimersByTimeAsync(5_100);
    expect(await screen.findByText('Sent')).toBeInTheDocument();
    const settled = reads;
    await vi.advanceTimersByTimeAsync(20_000);
    expect(reads).toBe(settled);
  });

  it('does not ask while the tab is hidden', async () => {
    let reads = 0;
    mockServer.use(
      http.get('*/admin/notification-campaigns/12', () => {
        reads += 1;
        return HttpResponse.json(campaignDetail({ id: 12, name: 'Hidden send', status: 'sending' }));
      }),
    );
    vi.useFakeTimers({ shouldAdvanceTime: true });
    await open(12, {}, 'Hidden send');
    await screen.findByText('Sending');
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' });
    const before = reads;
    await vi.advanceTimersByTimeAsync(20_000);
    expect(reads).toBe(before);
  });

  it('keeps asking while an email is still queued, even after the campaign is sent', async () => {
    let reads = 0;
    mockServer.use(
      http.get('*/admin/notification-campaigns/13', () => {
        reads += 1;
        const detail = campaignDetail({ id: 13, name: 'Almost done', status: 'sent' });
        detail.delivery.email.queued = reads < 2 ? 3 : 0;
        return HttpResponse.json(detail);
      }),
    );
    vi.useFakeTimers({ shouldAdvanceTime: true });
    await open(13, {}, 'Almost done');
    await screen.findByText('Sent');
    await vi.advanceTimersByTimeAsync(5_100);
    await waitFor(() => expect(reads).toBe(2));
    await vi.advanceTimersByTimeAsync(20_000);
    expect(reads).toBe(2);
  });
});
