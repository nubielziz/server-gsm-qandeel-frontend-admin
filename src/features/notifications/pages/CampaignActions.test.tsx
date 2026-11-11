// Tests for the other actions of the campaign page, run through the whole app against the dev mock API: Schedule and Reschedule (local time to ISO, the bounds, the
// time zone), Send test, Cancel, Delete, Edit and Duplicate.
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mockServer } from '@/mocks/node';
import { problem } from '@/mocks/problem';
import { setupMockApi } from '@/test/renderApp';
import { campaignDetail } from '../test/fixtures';
import { openNotifications, recordRequests } from '../test/notificationsPage';
import { toLocalInputValue } from '../lib/schedule';

setupMockApi();
// The page is a lazy chunk: the first test of a run waits for its modules to load, which is slow while the whole suite runs in parallel.
vi.setConfig({ testTimeout: 20_000 });
afterEach(() => mockServer.events.removeAllListeners());

async function openCampaign(id: number, name: string) {
  const user = userEvent.setup();
  const app = await openNotifications(`/notifications/${id}`, { heading: name });
  await screen.findByRole('button', { name: 'Duplicate' });
  return { user, app };
}
const dialog = async (name: string | RegExp) => within(await screen.findByRole('dialog', { name }));

describe('Schedule', () => {
  it('turns the local time into an ISO string, shows the time zone, and the status becomes Scheduled', async () => {
    const sent = recordRequests('/schedule');
    const { user } = await openCampaign(3, 'New unlock services');
    await user.click(screen.getByRole('button', { name: 'Schedule' }));
    const schedule = await dialog('Schedule campaign');
    expect(schedule.getByText(/Your time zone: .*\(UTC[+-]\d\d:\d\d\)/)).toBeInTheDocument();
    const input = schedule.getByLabelText('Send at') as HTMLInputElement;
    expect(input.type).toBe('datetime-local');
    const inAnHour = new Date(Date.now() + 3_600_000 * 5);
    inAnHour.setSeconds(0, 0);
    const local = toLocalInputValue(inAnHour);
    await user.type(input, local);
    await user.click(schedule.getByRole('button', { name: 'Schedule' }));
    await waitFor(() => expect(sent).toHaveLength(1));
    expect(sent[0].body).toEqual({ scheduledAt: inAnHour.toISOString() });
    expect(await screen.findByText('Campaign scheduled')).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: 'Reschedule' })).toBeInTheDocument();
  });

  it('offers a minimum of two minutes from now and a maximum of 90 days', async () => {
    const { user } = await openCampaign(3, 'New unlock services');
    await user.click(screen.getByRole('button', { name: 'Schedule' }));
    const input = (await dialog('Schedule campaign')).getByLabelText('Send at') as HTMLInputElement;
    const min = Date.parse(input.min.length === 16 ? `${input.min}:00` : input.min);
    const max = Date.parse(`${input.max}:00`);
    expect(min - Date.now()).toBeGreaterThan(60_000);
    expect(min - Date.now()).toBeLessThanOrEqual(2 * 60_000 + 1_000);
    expect(Math.round((max - Date.now()) / 86_400_000)).toBe(90);
  });

  it('asks for a time, and refuses one that is too soon, before it calls the server', async () => {
    const sent = recordRequests('/schedule');
    const { user } = await openCampaign(3, 'New unlock services');
    await user.click(screen.getByRole('button', { name: 'Schedule' }));
    const schedule = await dialog('Schedule campaign');
    await user.click(schedule.getByRole('button', { name: 'Schedule' }));
    expect(await schedule.findByText('Choose a date and time.')).toBeInTheDocument();
    await user.type(schedule.getByLabelText('Send at'), toLocalInputValue(Date.now() + 30_000));
    await user.click(schedule.getByRole('button', { name: 'Schedule' }));
    expect(await schedule.findByText(/at least 2 minutes from now/)).toBeInTheDocument();
    expect(sent).toEqual([]);
  });

  it("shows the server's refusal of the time under the input", async () => {
    mockServer.use(
      http.post('*/admin/notification-campaigns/3/schedule', () =>
        problem(422, 'VALIDATION_FAILED', 'Check the form', 'Bad time.', [
          { field: 'scheduledAt', message: 'Choose a time at most 90 days from now.' },
        ]),
      ),
    );
    const { user } = await openCampaign(3, 'New unlock services');
    await user.click(screen.getByRole('button', { name: 'Schedule' }));
    const schedule = await dialog('Schedule campaign');
    await user.type(schedule.getByLabelText('Send at'), toLocalInputValue(Date.now() + 3 * 3_600_000));
    await user.click(schedule.getByRole('button', { name: 'Schedule' }));
    expect(await schedule.findByText('Choose a time at most 90 days from now.')).toBeInTheDocument();
  });

  it('reschedules a scheduled campaign, starting from its time', async () => {
    const sent = recordRequests('/schedule');
    const { user } = await openCampaign(2, 'Ramadan offer');
    await user.click(screen.getByRole('button', { name: 'Reschedule' }));
    const schedule = await dialog('Reschedule campaign');
    const input = schedule.getByLabelText('Send at') as HTMLInputElement;
    expect(input.value).toMatch(/^\d{4}-\d\d-\d\dT\d\d:\d\d$/);
    expect(schedule.getByText(/Now set for /)).toBeInTheDocument();
    await user.click(schedule.getByRole('button', { name: 'Reschedule' }));
    await waitFor(() => expect(sent).toHaveLength(1));
    expect((sent[0].body as { scheduledAt: string }).scheduledAt).toBe(new Date(input.value).toISOString());
  });
});

describe('Send test', () => {
  it('defaults to in-app and email in English, sends, and the in-app item reaches the bell', async () => {
    const sent = recordRequests('/test');
    const { user } = await openCampaign(3, 'New unlock services');
    const before = await screen.findByRole('button', { name: /^Notifications, \d+ unread$/ });
    expect(before).toHaveAccessibleName('Notifications, 2 unread');
    await user.click(screen.getByRole('button', { name: 'Send test' }));
    const test = await dialog('Send a test to yourself');
    expect(test.getByRole('checkbox', { name: /In-app/ })).toBeChecked();
    expect(test.getByRole('checkbox', { name: /Email/ })).toBeChecked();
    expect(test.getByRole('combobox', { name: 'Language' })).toHaveValue('en');
    await user.click(test.getByRole('button', { name: 'Send test' }));
    await waitFor(() => expect(sent).toHaveLength(1));
    expect(sent[0].body).toEqual({ channels: ['in_app', 'email'], locale: 'en' });
    expect(await screen.findByText('Test queued')).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /^Notifications, \d+ unread$/ })).toHaveAccessibleName(
        'Notifications, 3 unread',
      ),
    );
  });

  it('sends only what is ticked, in Arabic, and wants at least one channel', async () => {
    const sent = recordRequests('/test');
    const { user } = await openCampaign(3, 'New unlock services');
    await user.click(screen.getByRole('button', { name: 'Send test' }));
    const test = await dialog('Send a test to yourself');
    await user.click(test.getByRole('checkbox', { name: /In-app/ }));
    await user.click(test.getByRole('checkbox', { name: /Email/ }));
    await user.click(test.getByRole('button', { name: 'Send test' }));
    expect(await test.findByText('Choose at least one channel.')).toBeInTheDocument();
    expect(sent).toEqual([]);
    await user.click(test.getByRole('checkbox', { name: /Email/ }));
    await user.selectOptions(test.getByRole('combobox', { name: 'Language' }), 'ar');
    await user.click(test.getByRole('button', { name: 'Send test' }));
    await waitFor(() => expect(sent).toHaveLength(1));
    expect(sent[0].body).toEqual({ channels: ['email'], locale: 'ar' });
  });
});

describe('Cancel', () => {
  it('asks first, then cancels a scheduled campaign and shows who and when', async () => {
    const { user } = await openCampaign(2, 'Ramadan offer');
    await user.click(screen.getByRole('button', { name: 'Cancel campaign' }));
    const cancel = await dialog('Cancel this campaign?');
    expect(
      cancel.getByText('The campaign will not go out. It stays in the list as cancelled.'),
    ).toBeInTheDocument();
    await user.click(cancel.getByRole('button', { name: 'Keep it' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Cancel campaign' }));
    await user.click(
      (await dialog('Cancel this campaign?')).getByRole('button', { name: 'Cancel campaign' }),
    );
    expect(await screen.findByText('Campaign cancelled')).toBeInTheDocument();
    expect(await screen.findByText('Cancelled', { selector: '.badge span, .badge *' })).toBeInTheDocument();
    // Created by Rami, and cancelled by him: the timeline names him twice.
    expect(within(screen.getByRole('region', { name: 'Timeline' })).getAllByText('Rami K.')).toHaveLength(2);
    expect(
      within(screen.getByRole('region', { name: 'Timeline' })).getByText('Cancelled'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Cancel campaign' })).not.toBeInTheDocument();
  });

  it('says what happens to the messages when the campaign is being sent', async () => {
    mockServer.use(
      http.get('*/admin/notification-campaigns/8', () =>
        HttpResponse.json(campaignDetail({ id: 8, name: 'Big send', status: 'sending' })),
      ),
    );
    const { user } = await openCampaign(8, 'Big send');
    await user.click(screen.getByRole('button', { name: 'Cancel campaign' }));
    expect(
      (await dialog('Cancel this campaign?')).getByText(
        /Messages not yet sent fail with "The campaign was cancelled\."/,
      ),
    ).toBeInTheDocument();
  });

  it("shows the server's refusal and keeps the dialog open", async () => {
    mockServer.use(
      http.post('*/admin/notification-campaigns/2/cancel', () =>
        problem(409, 'INVALID_TRANSITION', 'Not possible now', 'A sent campaign cannot be cancelled.'),
      ),
    );
    const { user } = await openCampaign(2, 'Ramadan offer');
    await user.click(screen.getByRole('button', { name: 'Cancel campaign' }));
    const cancel = await dialog('Cancel this campaign?');
    await user.click(cancel.getByRole('button', { name: 'Cancel campaign' }));
    expect(await cancel.findByText('A sent campaign cannot be cancelled.')).toBeInTheDocument();
  });
});

describe('Delete', () => {
  it('asks first, deletes the draft, goes back to the list and the draft is gone', async () => {
    const { user, app } = await openCampaign(3, 'New unlock services');
    await user.click(screen.getByRole('button', { name: 'Delete' }));
    const confirm = await dialog('Delete this draft?');
    expect(confirm.getByText('The draft is removed for good. Nothing was sent.')).toBeInTheDocument();
    await user.click(confirm.getByRole('button', { name: 'Delete draft' }));
    await waitFor(() => expect(app.location()).toBe('/notifications'), { timeout: 10_000 });
    expect(await screen.findByText('2 campaigns')).toBeInTheDocument();
    expect(screen.queryByText('New unlock services')).not.toBeInTheDocument();
    expect(screen.queryByText('Campaign not found')).not.toBeInTheDocument();
  });

  it("shows the server's refusal when the campaign is no longer a draft", async () => {
    mockServer.use(
      http.delete('*/admin/notification-campaigns/3', () =>
        problem(
          409,
          'NOT_A_DRAFT',
          'Not a draft',
          'Only a draft can be deleted; this campaign is scheduled. Cancel it instead.',
        ),
      ),
    );
    const { user, app } = await openCampaign(3, 'New unlock services');
    await user.click(screen.getByRole('button', { name: 'Delete' }));
    const confirm = await dialog('Delete this draft?');
    await user.click(confirm.getByRole('button', { name: 'Delete draft' }));
    expect(await confirm.findByText(/Cancel it instead\./)).toBeInTheDocument();
    expect(app.location()).toBe('/notifications/3');
  });
});

describe('Edit', () => {
  it('opens the composer filled with the campaign and saves changes with a PATCH, staying on the page', async () => {
    const sent = recordRequests('/admin/notification-campaigns/3');
    const { user, app } = await openCampaign(3, 'New unlock services');
    await user.click(screen.getByRole('button', { name: 'Edit' }));
    const composer = await dialog('Edit campaign');
    const name = composer.getByRole('textbox', { name: 'Name' });
    expect(name).toHaveValue('New unlock services');
    expect(composer.getByRole('textbox', { name: 'Title' })).toHaveValue('New unlock services');
    expect(composer.getByRole('button', { name: 'Merchants' })).toHaveAttribute('aria-pressed', 'true');
    await user.clear(name);
    await user.type(name, 'Unlock services, renamed');
    await user.click(composer.getByRole('button', { name: 'Save changes' }));
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Unlock services, renamed' }),
    ).toBeInTheDocument();
    expect(app.location()).toBe('/notifications/3');
    const patch = sent.find((request) => request.method === 'PATCH');
    expect(patch?.body).toMatchObject({
      name: 'Unlock services, renamed',
      audience: { merchants: {} },
      channels: ['in_app'],
    });
    expect(await screen.findByText('Campaign saved')).toBeInTheDocument();
  });

  it('is not offered for a sent campaign', async () => {
    await openCampaign(1, 'Scheduled maintenance on Friday');
    expect(screen.queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument();
  });
});

describe('Duplicate', () => {
  it('opens the composer filled in with "(copy)" and saves a new draft, which opens', async () => {
    const sent = recordRequests('/admin/notification-campaigns');
    const { user, app } = await openCampaign(1, 'Scheduled maintenance on Friday');
    await user.click(screen.getByRole('button', { name: 'Duplicate' }));
    const composer = await dialog('Duplicate campaign');
    expect(composer.getByRole('textbox', { name: 'Name' })).toHaveValue(
      'Scheduled maintenance on Friday (copy)',
    );
    expect(composer.getByRole('button', { name: 'Everyone' })).toHaveAttribute('aria-pressed', 'true');
    await user.click(composer.getByRole('tab', { name: 'العربية' }));
    expect(composer.getByRole('textbox', { name: 'العنوان' })).toHaveValue('صيانة مجدولة يوم الجمعة');
    await user.click(composer.getByRole('button', { name: 'Save draft' }));
    await waitFor(() => expect(app.location()).toBe('/notifications/4'), { timeout: 10_000 });
    const post = sent.find(
      (request) =>
        request.method === 'POST' && request.url.pathname.endsWith('/admin/notification-campaigns'),
    );
    expect(post?.body).toMatchObject({
      name: 'Scheduled maintenance on Friday (copy)',
      audience: { staff: {}, merchants: {}, customers: { hasAccount: true } },
    });
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Scheduled maintenance on Friday (copy)' }),
    ).toBeInTheDocument();
    expect(await screen.findByText('Draft')).toBeInTheDocument();
  });
});
