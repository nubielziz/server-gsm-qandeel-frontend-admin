// Tests for "Send now", run through the whole app against the dev mock API: a fresh count when the dialog opens, "Send to N people now?" with the channel split,
// the number the send confirms, the 409 CONFLICT path (the server's sentence, a new count, a second confirmation), and nobody reachable.
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mockServer } from '@/mocks/node';
import { problem } from '@/mocks/problem';
import { setupMockApi } from '@/test/renderApp';
import { campaignDetail } from '../test/fixtures';
import { openNotifications, recordRequests, serveCampaign } from '../test/notificationsPage';

setupMockApi();
// The page is a lazy chunk: the first test of a run waits for its modules to load, which is slow while the whole suite runs in parallel.
vi.setConfig({ testTimeout: 20_000 });
afterEach(() => mockServer.events.removeAllListeners());

const PREVIEW = (reachable: number) => ({
  total: reachable + 2,
  reachable,
  byType: { staff: 0, client: reachable, customer: 0 },
  byChannel: { inApp: reachable, email: 0, telegram: 0 },
  byLocale: { en: reachable, ar: 0 },
  excluded: { noConsent: 0, optedOut: 0, noTelegram: 0, noAccount: 2 },
});

async function openSend(id = 3, name = 'New unlock services') {
  const user = userEvent.setup();
  await openNotifications(`/notifications/${id}`, { heading: name });
  await user.click(await screen.findByRole('button', { name: 'Send now' }));
  return { user, dialog: within(await screen.findByRole('dialog')) };
}

describe('the count', () => {
  it("asks the server for a fresh count of the campaign's own audience and names the people and channels", async () => {
    const sent = recordRequests('/audience-preview');
    const { dialog } = await openSend();
    expect(await dialog.findByRole('heading', { name: 'Send to 24 people now?' })).toBeInTheDocument();
    expect(sent.at(-1)?.body).toEqual({
      audience: { merchants: {} },
      channels: ['in_app'],
      purpose: 'service',
    });
    expect(dialog.getByText(/24 merchants\. 24 in the app\./)).toBeInTheDocument();
    expect(dialog.getByText(/cannot be undone/)).toBeInTheDocument();
  });

  it('says who is left out and when it replaces a scheduled time', async () => {
    const { dialog } = await openSend(2, 'Ramadan offer');
    expect(await dialog.findByText(/customers did not agree to marketing/)).toBeInTheDocument();
    expect(dialog.getByText(/This sends it now instead of at /)).toBeInTheDocument();
  });
});

describe('the send', () => {
  it('posts the number it showed, then the campaign is queued and a toast says so', async () => {
    const sent = recordRequests('/send');
    const { user, dialog } = await openSend();
    await dialog.findByRole('heading', { name: 'Send to 24 people now?' });
    await user.click(dialog.getByRole('button', { name: 'Send now' }));
    await waitFor(() => expect(sent).toHaveLength(1));
    expect(sent[0]).toMatchObject({ method: 'POST', body: { confirmRecipients: 24 } });
    expect(await screen.findByText('Sending started')).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(await screen.findByText('Queued')).toBeInTheDocument();
    // A queued campaign can no longer be sent.
    expect(screen.queryByRole('button', { name: 'Send now' })).not.toBeInTheDocument();
  });

  it('does not send while the count is loading', async () => {
    mockServer.use(
      http.post('*/admin/notification-campaigns/audience-preview', async () => {
        await new Promise((resolve) => setTimeout(resolve, 400));
        return HttpResponse.json(PREVIEW(5));
      }),
    );
    const sent = recordRequests('/send');
    const { user, dialog } = await openSend();
    await user.click(dialog.getByRole('button', { name: 'Send now' }));
    expect(await dialog.findByText('Wait for the count, then send.')).toBeInTheDocument();
    expect(sent).toEqual([]);
  });

  it('says nobody can be reached and sends nothing when the count is zero', async () => {
    mockServer.use(
      http.post('*/admin/notification-campaigns/audience-preview', () =>
        HttpResponse.json({ ...PREVIEW(0), total: 3 }),
      ),
    );
    const sent = recordRequests('/send');
    const { user, dialog } = await openSend();
    await dialog.findByRole('heading', { name: 'Send to 0 people now?' });
    await user.click(dialog.getByRole('button', { name: 'Send now' }));
    expect(
      await dialog.findByText('Nobody can be reached with this audience and these channels.'),
    ).toBeInTheDocument();
    expect(sent).toEqual([]);
  });
});

describe('the audience changed meanwhile (409 CONFLICT)', () => {
  it("shows the server's sentence, reads the count again and confirms the new number on the second try", async () => {
    let reachable = 24;
    mockServer.use(
      http.post('*/admin/notification-campaigns/audience-preview', () =>
        HttpResponse.json(PREVIEW(reachable)),
      ),
    );
    const posted: number[] = [];
    mockServer.use(
      http.post('*/admin/notification-campaigns/3/send', async ({ request }) => {
        const { confirmRecipients } = (await request.json()) as { confirmRecipients: number };
        posted.push(confirmRecipients);
        if (confirmRecipients !== 40)
          return problem(
            409,
            'CONFLICT',
            'The audience changed',
            'The audience now reaches 40 people, not 24. Check the count and send again.',
          );
        return HttpResponse.json(
          campaignDetail({ id: 3, name: 'New unlock services', status: 'queued', expectedRecipients: 40 }),
          { status: 202 },
        );
      }),
    );
    const { user, dialog } = await openSend();
    await dialog.findByRole('heading', { name: 'Send to 24 people now?' });
    // Someone joined while the dialog was open: the next count says 40.
    reachable = 40;
    await user.click(dialog.getByRole('button', { name: 'Send now' }));
    expect(await dialog.findByText(/The audience now reaches 40 people, not 24\./)).toBeInTheDocument();
    expect(dialog.getByText(/press Send again to confirm it/)).toBeInTheDocument();
    expect(await dialog.findByRole('heading', { name: 'Send to 40 people now?' })).toBeInTheDocument();
    expect(posted).toEqual([24]);
    await user.click(dialog.getByRole('button', { name: 'Send now' }));
    await waitFor(() => expect(posted).toEqual([24, 40]));
    expect(await screen.findByText('Sending started')).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it("keeps the dialog open and shows the server's refusal for any other error", async () => {
    mockServer.use(
      http.post('*/admin/notification-campaigns/3/send', () =>
        problem(422, 'VALIDATION_FAILED', 'Check the form', 'Nobody is reachable.', [
          { field: 'audience', message: 'Nobody is reachable.' },
        ]),
      ),
    );
    const { user, dialog } = await openSend();
    await dialog.findByRole('heading', { name: 'Send to 24 people now?' });
    await user.click(dialog.getByRole('button', { name: 'Send now' }));
    expect(await dialog.findByText('Nobody is reachable.')).toBeInTheDocument();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it("shows the server's refusal to count, and Cancel closes the dialog", async () => {
    mockServer.use(
      http.post('*/admin/notification-campaigns/audience-preview', () =>
        problem(500, 'INTERNAL', 'Server error', 'The count failed.'),
      ),
    );
    serveCampaign(campaignDetail({ id: 3, name: 'New unlock services' }));
    const { user, dialog } = await openSend();
    expect(await dialog.findByText('The count failed.')).toBeInTheDocument();
    await user.click(dialog.getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
