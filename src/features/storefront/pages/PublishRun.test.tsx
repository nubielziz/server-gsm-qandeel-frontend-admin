// Tests for a publish run's page while it is not over: the preview being prepared (spinner, Cancel, then the draft by itself), the
// draft's frame (header, counts, the way back; the preview itself is slice C3's), and the publishing in the background (the meter,
// the line, Stop and its confirmation, the move to the result). The mock moves a run by reads, so each wait is one 1.5 s poll.
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http } from 'msw';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mockServer } from '@/mocks/node';
import { problem } from '@/mocks/problem';
import { setupMockApi, signInAs } from '@/test/renderApp';
import { applyPublishRun, createPublishRun } from '../api';
import { recordRequests } from '../test/requests';
import { lastOf, openPublishStart, openRun, PUBLISH_PERMISSIONS, publishRoute } from '../test/publishPage';
import { openStorefront, tableNamed } from '../test/storefrontPage';

setupMockApi();
vi.setConfig({ testTimeout: 40_000 });
afterEach(() => vi.restoreAllMocks());

const POLL = { timeout: 8_000 };
const DRAFT = 5;

/** Starts publishing the draft (run 5) on the server, so the page opens on a run that is queued. */
async function startPublishing() {
  await signInAs();
  await applyPublishRun(DRAFT, {});
}

describe('a preview being prepared', () => {
  it('shows the spinner line with the number of services, then the draft by itself', async () => {
    const user = userEvent.setup();
    await openPublishStart();
    await user.click(screen.getByRole('button', { name: 'Prepare the preview' }));
    const line = await screen.findByText('Preparing the preview of 60 services…');
    expect(line.closest('[role="status"]')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeEnabled();
    expect(screen.getByText('Preparing')).toBeInTheDocument();
    // The second read says the preview is ready: the page moves on without a click.
    expect(await screen.findByLabelText('Publish preview', {}, POLL)).toBeInTheDocument();
    expect(screen.queryByText('Preparing the preview of 60 services…')).not.toBeInTheDocument();
    expect(screen.getByText('Draft')).toBeInTheDocument();
  });

  it('Cancel discards the preview and goes back to the start of the tab', async () => {
    const user = userEvent.setup();
    const requests = recordRequests();
    const app = await openPublishStart();
    await user.click(screen.getByRole('button', { name: 'Prepare the preview' }));
    await user.click(await screen.findByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(app.location()).toBe('/storefront?tab=publish'));
    expect(lastOf(requests, 'POST', /\/admin\/publish-runs\/8\/cancel$/).body).toEqual({});
    expect(
      await screen.findByRole('heading', { level: 2, name: 'Publish services to the shop' }),
    ).toBeInTheDocument();
    // The history shows the newest run, the one just discarded, as cancelled.
    const newest = within((await tableNamed('Publish runs')).getAllByRole('row')[1]);
    expect(newest.getByText('Cancelled')).toBeInTheDocument();
    expect(newest.getByRole('link', { name: 'Open run 8' })).toBeInTheDocument();
  });

  it('says why when Cancel is refused', async () => {
    const user = userEvent.setup();
    mockServer.use(
      http.post('*/admin/publish-runs/:id/cancel', () =>
        problem(409, 'CONFLICT', 'Not in the right state', 'This run is already finished.'),
      ),
    );
    await openPublishStart();
    await user.click(screen.getByRole('button', { name: 'Prepare the preview' }));
    await user.click(await screen.findByRole('button', { name: 'Cancel' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('This run is already finished.');
  });
});

describe('the draft', () => {
  it('shows the header with the scope, who started it and its status, and the numbers of the draft', async () => {
    await openRun(DRAFT);
    const header = screen.getByRole('heading', { level: 2, name: 'Publish run 5' }).parentElement!;
    expect(header).toHaveTextContent('Everything not on the shop yet');
    expect(header).toHaveTextContent('by Rami K.');
    expect(screen.getByText('Draft')).toBeInTheDocument();
    // The preview itself is slice C3's: the frame says how many rows there are in each state.
    expect(await screen.findByLabelText('Publish preview')).toHaveTextContent(
      'The preview of 60 services is ready: 30 ready, 11 need a look, 19 cannot be published, 30 will be published.',
    );
  });

  it('All runs goes back to the start of the tab', async () => {
    const user = userEvent.setup();
    const app = await openRun(DRAFT);
    await user.click(screen.getByRole('link', { name: 'All runs' }));
    expect(app.location()).toBe('/storefront?tab=publish');
    expect(await screen.findByRole('heading', { level: 2, name: 'Earlier runs' })).toBeInTheDocument();
  });

  it('says so when the run cannot be read, with Retry', async () => {
    const user = userEvent.setup();
    mockServer.use(
      http.get('*/admin/publish-runs/:id', () => problem(500, 'INTERNAL', 'Server error', 'The run failed.')),
    );
    await openStorefront(publishRoute(DRAFT));
    expect(await screen.findByText('Could not load this run')).toBeInTheDocument();
    mockServer.resetHandlers();
    await user.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByLabelText('Publish preview')).toBeInTheDocument();
  });
});

describe('publishing in the background', () => {
  it('shows the meter, the line and the note, then moves to the result when the server finishes', async () => {
    await startPublishing();
    await openRun(DRAFT);
    // The first read of a run that is queued says it is running, half done.
    expect(await screen.findByRole('meter', { name: 'Publish progress' })).toHaveAttribute(
      'aria-valuenow',
      '50',
    );
    // The seed marks one row that the apply refuses (its cost moved), so 15 are done and 14 are on the shop.
    expect(screen.getByText('15 of 30 services, 14 on the shop')).toBeInTheDocument();
    expect(screen.getByText('It keeps running after you leave this page.')).toBeInTheDocument();
    expect(screen.getByText('Publishing')).toBeInTheDocument();
    // The next read says it is done: the headline replaces the meter.
    expect(await screen.findByText('29 services are on the shop', {}, POLL)).toBeInTheDocument();
    expect(screen.queryByRole('meter', { name: 'Publish progress' })).not.toBeInTheDocument();
  });

  it('refreshes the listings count and says how many were published when a run it watched ends', async () => {
    await startPublishing();
    const requests = recordRequests();
    await openRun(DRAFT);
    await screen.findByText('29 services are on the shop', {}, POLL);
    expect(await screen.findByText('29 services published')).toBeInTheDocument();
    // The number on the first tab and the other counts are asked again: the shop has new listings.
    const listings = () => requests.sent().filter((sent) => sent.url.pathname === '/admin/service-listings');
    await waitFor(() => expect(listings().length).toBeGreaterThanOrEqual(2));
  });

  it('raises no toast for a run that had ended before the page opened', async () => {
    await openRun(1);
    expect(await screen.findByText('9 services are on the shop')).toBeInTheDocument();
    expect(screen.queryByText(/services published$/)).not.toBeInTheDocument();
  });

  it('tells a run that waits for its turn, before it starts', async () => {
    await signInAs();
    const run = await createPublishRun({ scope: { kind: 'all' } });
    mockServer.use(
      http.get(`*/admin/publish-runs/${run.id}`, () =>
        Response.json({
          ...run,
          status: 'queued',
          preparedAt: run.createdAt,
          counts: { ...run.counts, included: 30, pending: 60 },
        }),
      ),
    );
    await openRun(run.id);
    expect(await screen.findByText('Waiting to start…')).toBeInTheDocument();
    expect(screen.queryByRole('meter', { name: 'Publish progress' })).not.toBeInTheDocument();
  });

  it('Stop asks first, then stops the run: what was published stays', async () => {
    const user = userEvent.setup();
    await startPublishing();
    const requests = recordRequests();
    await openRun(DRAFT);
    await screen.findByRole('meter', { name: 'Publish progress' });
    await user.click(screen.getByRole('button', { name: 'Stop' }));
    const dialog = within(screen.getByRole('dialog', { name: 'Stop publishing?' }));
    expect(dialog.getByText(/The services already published stay on the shop/)).toBeInTheDocument();
    await user.click(dialog.getByRole('button', { name: 'Stop publishing' }));
    expect(await screen.findByText(/This run was stopped\./)).toHaveTextContent(
      'The services already published stay on the shop.',
    );
    expect(lastOf(requests, 'POST', /\/admin\/publish-runs\/5\/cancel$/).body).toEqual({});
    expect(screen.getByText('Cancelled')).toBeInTheDocument();
  });

  it('keeps the dialog open with the server’s words when Stop is refused', async () => {
    const user = userEvent.setup();
    await startPublishing();
    mockServer.use(
      http.post('*/admin/publish-runs/:id/cancel', () =>
        problem(403, 'FORBIDDEN', 'Forbidden', 'You need the storefront:publish permission.'),
      ),
    );
    await openRun(DRAFT);
    await screen.findByRole('meter', { name: 'Publish progress' });
    await user.click(screen.getByRole('button', { name: 'Stop' }));
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Stop publishing' }));
    expect(
      await within(screen.getByRole('dialog')).findByText('You need the storefront:publish permission.'),
    ).toBeInTheDocument();
  });

  it('disables Stop without storefront:publish and names the permission', async () => {
    await startPublishing();
    await openRun(DRAFT, { permissions: PUBLISH_PERMISSIONS.filter((one) => one !== 'storefront:publish') });
    await screen.findByRole('meter', { name: 'Publish progress' });
    const stop = screen.getByRole('button', { name: 'Stop' });
    expect(stop).toBeDisabled();
    expect(stop).toHaveAttribute('title', 'You need the storefront:publish permission');
  });
});
