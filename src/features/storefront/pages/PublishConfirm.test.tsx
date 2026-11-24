// Tests for the pinned bar of the preview and the dialog behind Publish: the bar's line and buttons, the permission that Publish
// needs, the dialog's body (what is put on the shop, what stays out, the note about prices, "On the shop"), the tick box above 500
// services, the body of the apply, and the refusals (a run already going re-reads the run). The draft is run 5 of the mock.
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mockServer } from '@/mocks/node';
import { problem } from '@/mocks/problem';
import { setupMockApi, signInAs } from '@/test/renderApp';
import { getPublishRun } from '../api';
import { CONFIRM_ABOVE } from '../lib/publish';
import { storefrontStore } from '../mocks/store';
import { lastOf, PUBLISH_PERMISSIONS } from '../test/publishPage';
import { DRAFT, openPreview } from '../test/publishPreview';
import { recordRequests } from '../test/requests';

setupMockApi();
vi.setConfig({ testTimeout: 40_000 });
afterEach(() => vi.restoreAllMocks());

const POLL = { timeout: 8_000 };

/** Makes the server count the draft with other figures (the rest of the draft is the mock's own). */
async function withCounts(counts: Record<string, number>) {
  await signInAs();
  const run = await getPublishRun(DRAFT);
  mockServer.use(
    http.get('*/admin/publish-runs/5', () =>
      HttpResponse.json({
        ...run,
        total: Math.max(run.total, counts.included ?? 0),
        counts: { ...run.counts, ...counts },
      }),
    ),
  );
}

const publishButton = (included = 30) => screen.getByRole('button', { name: `Publish ${included} services` });

async function openConfirm(user: ReturnType<typeof userEvent.setup>, included = 30) {
  await user.click(publishButton(included));
  return within(await screen.findByRole('dialog', { name: `Publish ${included} services?` }));
}

describe('the pinned bar', () => {
  it('says how many services will be published, and offers the primary Publish and Discard this preview', async () => {
    await openPreview();
    expect(screen.getByText('30 services will be published.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Discard this preview' })).toBeEnabled();
    expect(publishButton()).toBeEnabled();
    expect(publishButton().className).toContain('btn-primary');
  });

  it('is one bar with the footer pager: the buttons in its first row, the pager under them', async () => {
    await openPreview();
    const bar = publishButton().closest('.pinned-bar');
    expect(bar).not.toBeNull();
    expect(within(bar as HTMLElement).getByRole('navigation', { name: 'Pagination' })).toBeInTheDocument();
    expect(document.querySelectorAll('.pinned-bar')).toHaveLength(1);
  });

  it('moves with the Include switches: one more row, one more service', async () => {
    const user = userEvent.setup();
    await openPreview();
    await user.click(
      screen.getAllByRole('switch', {
        name: /^Include Unlock iPhone 11 12 13 14 15 Pro Max All Carriers USA Canada UK Australia 1-5 Days Clean Barred Unpaid Bills$/,
      })[0],
    );
    expect(await screen.findByRole('button', { name: 'Publish 31 services' })).toBeEnabled();
  });

  it('says "1 service" for one', async () => {
    await withCounts({ included: 1 });
    await openPreview();
    expect(await screen.findByRole('button', { name: 'Publish 1 service' })).toBeEnabled();
    expect(screen.getByText('1 service will be published.')).toBeInTheDocument();
  });

  it('turns Publish off, and says so, when no row is included', async () => {
    await withCounts({ included: 0 });
    await openPreview();
    const button = await screen.findByRole('button', { name: 'Publish 0 services' });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('title', 'Include at least one row first.');
    expect(screen.getByText('No row is included.')).toBeInTheDocument();
  });

  it('turns Publish off with the permission named when the role cannot publish, and leaves Discard on', async () => {
    await openPreview({
      permissions: PUBLISH_PERMISSIONS.filter((permission) => permission !== 'storefront:publish'),
    });
    const button = publishButton();
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('title', 'You need the storefront:publish permission');
    expect(screen.getByRole('button', { name: 'Discard this preview' })).toBeEnabled();
  });
});

describe('the dialog behind Publish', () => {
  it('says what goes on the shop, what stays out, how prices are worked out and that it can be undone', async () => {
    const user = userEvent.setup();
    await openPreview();
    const dialog = await openConfirm(user);
    expect(dialog.getByText('This puts 30 services on the shop at the prices shown.')).toBeInTheDocument();
    expect(dialog.getByText('30 stay out: they need a look or cannot be published.')).toBeInTheDocument();
    expect(
      dialog.getByText(
        'Prices are worked out again when each service is published: a price follows its rule if the cost changed a little since this preview, and a service whose cost changed a lot is left out for you to check.',
      ),
    ).toBeInTheDocument();
    expect(dialog.getByText('You can take them off the shop again with one button.')).toBeInTheDocument();
    const group = within(dialog.getByRole('group', { name: 'On the shop' }));
    expect(group.getByRole('radio', { name: 'At once' })).toBeChecked();
    expect(group.getByRole('radio', { name: 'Create them switched off' })).not.toBeChecked();
    expect(dialog.queryByRole('checkbox')).not.toBeInTheDocument();
    expect(dialog.getByRole('button', { name: 'Publish 30 services' })).toBeEnabled();
  });

  it('says "1 stays out" for one row', async () => {
    const user = userEvent.setup();
    await withCounts({ included: 59 });
    await openPreview();
    const dialog = await openConfirm(user, 59);
    expect(dialog.getByText('1 stays out: it needs a look or cannot be published.')).toBeInTheDocument();
  });

  it('leaves out the line about rows that stay out when every row is included', async () => {
    const user = userEvent.setup();
    await withCounts({ included: 60 });
    await openPreview();
    const dialog = await openConfirm(user, 60);
    expect(dialog.queryByText(/stay out|stays out/)).not.toBeInTheDocument();
  });

  it('publishes at once by default: sends `listed: true`, closes, and the page follows the run', async () => {
    const user = userEvent.setup();
    const requests = recordRequests();
    await openPreview();
    const dialog = await openConfirm(user);
    await user.click(dialog.getByRole('button', { name: 'Publish 30 services' }));
    await waitFor(() =>
      expect(lastOf(requests, 'POST', /\/admin\/publish-runs\/5\/apply$/).body).toEqual({ listed: true }),
    );
    expect(await screen.findByRole('meter', { name: 'Publish progress' }, POLL)).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.queryByRole('table', { name: 'Publish preview' })).not.toBeInTheDocument();
  });

  it('puts the preview’s page and sort out of the address once the run is taken, so the result table starts clean', async () => {
    const user = userEvent.setup();
    const app = await openPreview();
    await user.click(screen.getByRole('button', { name: /^Cost/ }));
    await user.click(await screen.findByRole('button', { name: 'Next page' }));
    await waitFor(() => expect(app.location()).toContain('page=2'));
    expect(app.location()).toContain('sort=cost');
    expect(await screen.findByText('Results: 51 - 60 of 60')).toBeInTheDocument();
    const dialog = await openConfirm(user);
    await user.click(dialog.getByRole('button', { name: 'Publish 30 services' }));
    await waitFor(() => expect(app.location()).toBe('/products?view=publish&run=5'));
    // The result of the run shows its first rows in the order of the run, not page 2 of the preview's sort.
    expect(await screen.findByText('29 services are on the shop', {}, POLL)).toBeInTheDocument();
    expect(await screen.findByText('Results: 1 - 50 of 60')).toBeInTheDocument();
    expect(app.location()).toBe('/products?view=publish&run=5');
  });

  it('keeps the address as it is when the server refuses the run', async () => {
    const user = userEvent.setup();
    mockServer.use(
      http.post('*/admin/publish-runs/:id/apply', () =>
        problem(422, 'VALIDATION_FAILED', 'Check the form', 'Some fields need attention.', [
          { field: 'included', message: 'No row is included.' },
        ]),
      ),
    );
    const app = await openPreview();
    await user.click(screen.getByRole('button', { name: /^Cost/ }));
    await waitFor(() => expect(app.location()).toContain('sort=cost'));
    const dialog = await openConfirm(user);
    await user.click(dialog.getByRole('button', { name: 'Publish 30 services' }));
    expect(await dialog.findByText('No row is included.')).toBeInTheDocument();
    expect(app.location()).toContain('sort=cost');
  });

  it('"Create them switched off" changes the sentence and sends `listed: false`; the result says so', async () => {
    const user = userEvent.setup();
    const requests = recordRequests();
    await openPreview();
    const dialog = await openConfirm(user);
    await user.click(dialog.getByRole('radio', { name: 'Create them switched off' }));
    expect(
      dialog.getByText('This creates 30 services switched off, at the prices shown.'),
    ).toBeInTheDocument();
    expect(dialog.queryByText(/on the shop at the prices shown/)).not.toBeInTheDocument();
    await user.click(dialog.getByRole('button', { name: 'Publish 30 services' }));
    await waitFor(() =>
      expect(lastOf(requests, 'POST', /\/admin\/publish-runs\/5\/apply$/).body).toEqual({ listed: false }),
    );
    expect(await screen.findByText('29 services were created switched off', {}, POLL)).toBeInTheDocument();
  });

  it('Cancel closes the dialog and sends no apply', async () => {
    const user = userEvent.setup();
    const requests = recordRequests();
    await openPreview();
    const dialog = await openConfirm(user);
    await user.click(dialog.getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(requests.sent().some((sent) => /\/apply$/.test(sent.url.pathname))).toBe(false);
  });
});

describe(`above ${CONFIRM_ABOVE} services`, () => {
  it(`asks for the tick box first: the button is off until it is ticked, and ${CONFIRM_ABOVE} needs none`, async () => {
    const user = userEvent.setup();
    const requests = recordRequests();
    await withCounts({ included: CONFIRM_ABOVE + 1 });
    await openPreview();
    const dialog = await openConfirm(user, CONFIRM_ABOVE + 1);
    const button = dialog.getByRole('button', { name: 'Publish 501 services' });
    const box = dialog.getByRole('checkbox', { name: 'I checked the preview. Publish 501 services.' });
    expect(box).not.toBeChecked();
    expect(button).toBeDisabled();
    await user.click(button);
    expect(requests.sent().some((sent) => /\/apply$/.test(sent.url.pathname))).toBe(false);
    await user.click(box);
    expect(button).toBeEnabled();
    await user.click(button);
    await waitFor(() =>
      expect(lastOf(requests, 'POST', /\/admin\/publish-runs\/5\/apply$/).body).toEqual({ listed: true }),
    );
  });

  it('asks for no tick box at exactly the limit', async () => {
    const user = userEvent.setup();
    await withCounts({ included: CONFIRM_ABOVE });
    await openPreview();
    const dialog = await openConfirm(user, CONFIRM_ABOVE);
    expect(dialog.queryByRole('checkbox')).not.toBeInTheDocument();
    expect(dialog.getByRole('button', { name: 'Publish 500 services' })).toBeEnabled();
  });
});

describe('a refusal', () => {
  it('keeps the dialog open and shows the server’s words', async () => {
    const user = userEvent.setup();
    mockServer.use(
      http.post('*/admin/publish-runs/:id/apply', () =>
        problem(422, 'VALIDATION_FAILED', 'Check the form', 'Some fields need attention.', [
          { field: 'included', message: 'No row is included.' },
        ]),
      ),
    );
    await openPreview();
    const dialog = await openConfirm(user);
    await user.click(dialog.getByRole('button', { name: 'Publish 30 services' }));
    expect(await dialog.findByText('No row is included.')).toBeInTheDocument();
    expect(screen.getByRole('dialog', { name: 'Publish 30 services?' })).toBeInTheDocument();
  });

  it('409 JOB_ALREADY_RUNNING says so in the dialog and re-reads the run, so the page follows it', async () => {
    const user = userEvent.setup();
    mockServer.use(
      http.post('*/admin/publish-runs/:id/apply', async () => {
        // Somebody else started it a moment ago: the run is going now.
        const stores = await storefrontStore();
        const mock = stores.publish.runs.find('5');
        if (mock) mock.run.status = 'queued';
        return problem(409, 'JOB_ALREADY_RUNNING', 'Already running', 'This run is already being published.');
      }),
    );
    await openPreview();
    const dialog = await openConfirm(user);
    await user.click(dialog.getByRole('button', { name: 'Publish 30 services' }));
    // The page re-reads the run and leaves the preview for the progress of the run that is going.
    expect(await screen.findByRole('meter', { name: 'Publish progress' }, POLL)).toBeInTheDocument();
    expect(screen.queryByRole('table', { name: 'Publish preview' })).not.toBeInTheDocument();
  });

  it('409 for a run that is no longer a draft shows the sentence and reads the run again', async () => {
    const user = userEvent.setup();
    const requests = recordRequests();
    mockServer.use(
      http.post('*/admin/publish-runs/:id/apply', () =>
        problem(409, 'CONFLICT', 'Not in the right state', 'The preview is still being prepared.'),
      ),
    );
    await openPreview();
    const reads = () =>
      requests
        .sent()
        .filter((sent) => sent.method === 'GET' && /\/admin\/publish-runs\/5$/.test(sent.url.pathname))
        .length;
    const before = reads();
    const dialog = await openConfirm(user);
    await user.click(dialog.getByRole('button', { name: 'Publish 30 services' }));
    expect(await dialog.findByText('The preview is still being prepared.')).toBeInTheDocument();
    await waitFor(() => expect(reads()).toBeGreaterThan(before));
  });
});
