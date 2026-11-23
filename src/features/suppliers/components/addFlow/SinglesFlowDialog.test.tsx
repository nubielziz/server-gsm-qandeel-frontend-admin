// Tests for the single-services path of the Add services flow, mounted in the real app shell against the dev mock API: the three
// steps, the server's preview, the import in batches of 500, one shop preview per batch that created services, what is kept when a
// later batch fails, and the switch's locks. The suppliers' own mocks play the server; the publish run route is answered here.
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { Route } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { storefrontPricingPath, storefrontPublishPath } from '@/features/storefront';
import { mockServer } from '@/mocks/node';
import { problem } from '@/mocks/problem';
import { mockMe, renderShell, setupMockApi, signInAs } from '@/test/renderApp';
import { recordRequests } from '../../test/requests';
import { listSupplierServices, listSuppliers } from '../../api';
import { mocks } from '../../mocks';
import { addNotImported } from '../../test/bigCatalogue';
import type { Supplier } from '../../types';
import { SinglesFlowDialog } from './SinglesFlowDialog';

setupMockApi();
vi.setConfig({ testTimeout: 30_000 });
beforeEach(() => mockServer.use(...mocks.handlers));
afterEach(() => vi.restoreAllMocks());

type User = ReturnType<typeof userEvent.setup>;
type Scope = ReturnType<typeof within>;

const SWITCH = 'Prepare them for the shop';
/** The three services Nordic GSM offers that the console has not imported, in the order the picker reads them (by name). */
const NEW_NAMES = ['Rogers Canada Unlock', 'Sprint USA Premium Unlock', 'Telstra Australia Unlock'];

/** Mounts the dialog (the suppliers page hands it a supplier of its list) in the shell; a second route stands in for the Catalog. */
async function openFlow(options: { permissions?: string[] } = {}) {
  await signInAs();
  if (options.permissions) mockMe({ id: 1, name: 'Rami K.', permissions: options.permissions });
  const supplier = (await listSuppliers()).data.find((row) => row.name === 'Nordic GSM') as Supplier;
  const props = { onBack: vi.fn(), onClose: vi.fn(), onDone: vi.fn() };
  const app = renderShell(
    '/probe',
    <>
      <Route path="/probe" element={<SinglesFlowDialog supplier={supplier} {...props} />} />
      <Route path="/catalog" element={<p>Catalog stand-in</p>} />
    </>,
  );
  const dialog = within(await screen.findByRole('dialog', { name: 'Add services' }, { timeout: 10_000 }));
  await dialog.findByRole('table', { name: 'Supplier services' });
  return { app, dialog, ...props };
}

/** The picker's "Select all not imported" box ticks every service not imported yet, whatever page it is on. */
async function pickAllNew(user: User, dialog: Scope, count: string) {
  await user.click(await dialog.findByRole('checkbox', { name: `Select all not imported (${count})` }));
  await dialog.findByText(`${count} picked`);
}

/** Picks everything new, previews it and goes on to the last step; answers the switch of that step once it can be used. */
async function toFinish(user: User, dialog: Scope, count: string) {
  await pickAllNew(user, dialog, count);
  await user.click(dialog.getByRole('button', { name: `Preview (${count})` }));
  await dialog.findByRole('table', { name: 'Import preview' });
  await user.click(dialog.getByRole('button', { name: 'Next' }));
  return dialog.findByRole('switch', { name: SWITCH });
}

async function turnOn(user: User, box: HTMLElement) {
  await waitFor(() => expect(box).toBeEnabled());
  await user.click(box);
  expect(box).toHaveAttribute('aria-checked', 'true');
}

/** Answers `POST /admin/publish-runs` with a run (ids 41, 42…) and writes down the body of each call. */
function answerRuns() {
  const bodies: { scope: { kind: string; serviceIds: number[] } }[] = [];
  mockServer.use(
    http.post('*/admin/publish-runs', async ({ request }) => {
      bodies.push((await request.json()) as (typeof bodies)[number]);
      return HttpResponse.json({ id: 40 + bodies.length, status: 'preparing' }, { status: 202 });
    }),
  );
  return bodies;
}

const importCalls = (requests: ReturnType<typeof recordRequests>) =>
  requests
    .sent()
    .filter((call) => call.method === 'POST' && call.url.pathname === '/admin/suppliers/1/import');
const publishCalls = (requests: ReturnType<typeof recordRequests>) =>
  requests.sent().filter((call) => call.method === 'POST' && call.url.pathname === '/admin/publish-runs');

const stepNow = (dialog: Scope) =>
  within(dialog.getByRole('list', { name: 'Steps' }))
    .getAllByRole('listitem')
    .find((item) => item.getAttribute('aria-current') === 'step')?.textContent;

describe('the three steps', () => {
  it('picks, shows the server’s preview with a suggested price per row, then goes to the last step', async () => {
    const user = userEvent.setup();
    const { dialog } = await openFlow();
    expect(stepNow(dialog)).toContain('Prices and category');
    await pickAllNew(user, dialog, '3');
    await user.click(dialog.getByRole('button', { name: 'Preview (3)' }));

    const preview = within(await dialog.findByRole('table', { name: 'Import preview' }));
    expect(stepNow(dialog)).toContain('Prices and category');
    expect(dialog.getByText('3 new.')).toBeInTheDocument();
    const sprint = within(preview.getByText('Sprint USA Premium Unlock').closest('tr') as HTMLElement);
    expect(sprint.getByText('New')).toBeInTheDocument();
    expect(sprint.getByText('$4.00')).toBeInTheDocument(); // the server's suggested price
    expect(dialog.getByText(/^New services are added on sale at the suggested price/)).toBeInTheDocument();

    await user.click(dialog.getByRole('button', { name: 'Next' }));
    expect(await dialog.findByText('Ready to add 3 services from Nordic GSM: 3 new.')).toBeInTheDocument();
    expect(stepNow(dialog)).toContain('Finish');
    // Nothing has been sent to the import yet, and the switch starts off.
    expect(dialog.getByRole('switch', { name: SWITCH })).toHaveAttribute('aria-checked', 'false');
  });

  it('moves focus to the heading of each new step, so no button holds it', async () => {
    const user = userEvent.setup();
    const { dialog } = await openFlow();
    await pickAllNew(user, dialog, '3');
    const focused = async (name: string) => {
      const heading = await dialog.findByRole('heading', { name });
      await waitFor(() => expect(heading).toHaveFocus());
    };
    await user.click(dialog.getByRole('button', { name: 'Preview (3)' }));
    await focused('Check the prices');
    await user.click(dialog.getByRole('button', { name: 'Next' }));
    await focused('Finish: add the services');
    await user.click(dialog.getByRole('button', { name: 'Back' }));
    await focused('Check the prices');
  });

  it('does not start the import when Next is pressed twice quickly: the second press finds no button', async () => {
    const user = userEvent.setup();
    const requests = recordRequests();
    const { dialog } = await openFlow();
    await pickAllNew(user, dialog, '3');
    await user.click(dialog.getByRole('button', { name: 'Preview (3)' }));
    await dialog.findByRole('table', { name: 'Import preview' });
    const next = dialog.getByRole('button', { name: 'Next' });
    await user.dblClick(next);

    expect(await dialog.findByText('Ready to add 3 services from Nordic GSM: 3 new.')).toBeInTheDocument();
    // Start is a button of its own, not Next turned into Start: it is still waiting to be pressed.
    expect(dialog.getByRole('button', { name: 'Start' })).not.toBe(next);
    expect(dialog.getByRole('button', { name: 'Start' })).toBeEnabled();
    expect(importCalls(requests)).toHaveLength(0);
    expect(dialog.queryByText('3 services added')).not.toBeInTheDocument();
  });

  it('goes back one screen at a time, keeping the picks, and to the first step from the picker', async () => {
    const user = userEvent.setup();
    const { dialog, onBack } = await openFlow();
    await toFinish(user, dialog, '3');
    await user.click(dialog.getByRole('button', { name: 'Back' }));
    await dialog.findByRole('table', { name: 'Import preview' });
    await user.click(dialog.getByRole('button', { name: 'Back' }));
    expect(await dialog.findByText('3 picked')).toBeInTheDocument();
    expect(onBack).not.toHaveBeenCalled();
    await user.click(dialog.getByRole('button', { name: 'Back' }));
    expect(onBack).toHaveBeenCalledTimes(1);
  });
});

describe('the import and the shop previews', () => {
  it('imports, starts one shop preview for exactly the services it created, and links it to review and publish', async () => {
    const user = userEvent.setup();
    const requests = recordRequests();
    const runs = answerRuns();
    const { app, dialog, onDone, onClose } = await openFlow();
    await turnOn(user, await toFinish(user, dialog, '3'));
    await user.click(dialog.getByRole('button', { name: 'Start' }));

    expect(await dialog.findByText('3 services added')).toBeInTheDocument();
    expect(dialog.getByRole('button', { name: 'Done' })).toBeInTheDocument();
    expect(importCalls(requests)).toHaveLength(1);

    // The preview is for the three services this call made, in creation order: the ones now linked to the supplier's services.
    const offered = (await listSupplierServices(1)).data;
    const made = NEW_NAMES.map((name) => offered.find((item) => item.name === name)?.linkedServiceId);
    expect(made.every((id) => typeof id === 'number')).toBe(true);
    expect(runs).toEqual([{ scope: { kind: 'services', serviceIds: made } }]);
    expect(publishCalls(requests)).toHaveLength(1);

    expect(dialog.getByText('A shop preview is ready for 3 services.')).toBeInTheDocument();
    const link = dialog.getByRole('link', { name: 'Review and publish' });
    expect(link).toHaveAttribute('href', storefrontPublishPath(41));
    await waitFor(() => expect(onDone).toHaveBeenCalledTimes(1));

    // The flow closes before the page changes.
    await user.click(link);
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(app.location()).toBe(storefrontPublishPath(41));
  });

  it('starts no shop preview with the switch off', async () => {
    const user = userEvent.setup();
    const requests = recordRequests();
    const runs = answerRuns();
    const { dialog, onDone } = await openFlow();
    await toFinish(user, dialog, '3');
    await user.click(dialog.getByRole('button', { name: 'Start' }));

    expect(await dialog.findByText('3 services added')).toBeInTheDocument();
    expect(runs).toEqual([]);
    expect(publishCalls(requests)).toHaveLength(0);
    expect(dialog.queryByRole('list', { name: 'Shop previews' })).not.toBeInTheDocument();
    await waitFor(() => expect(onDone).toHaveBeenCalledTimes(1));
  });

  it('says it with the server’s words when a shop preview cannot be started, and the import stays done', async () => {
    const user = userEvent.setup();
    mockServer.use(
      http.post('*/admin/publish-runs', () =>
        problem(
          409,
          'JOB_ALREADY_RUNNING',
          'Already running',
          'A publish run is already going for these services.',
        ),
      ),
    );
    const { dialog, onDone } = await openFlow();
    await turnOn(user, await toFinish(user, dialog, '3'));
    await user.click(dialog.getByRole('button', { name: 'Start' }));

    expect(await dialog.findByText('3 services added')).toBeInTheDocument();
    expect(
      dialog.getByText(
        'The shop preview for 3 services could not be started. A publish run is already going for these services.',
      ),
    ).toBeInTheDocument();
    expect(dialog.queryByRole('link', { name: 'Review and publish' })).not.toBeInTheDocument();
    expect(dialog.getByRole('button', { name: 'Done' })).toBeInTheDocument();
    await waitFor(() => expect(onDone).toHaveBeenCalledTimes(1));
  });

  it('says so when the server does not name the services it created, and asks for no preview', async () => {
    const user = userEvent.setup();
    const requests = recordRequests();
    mockServer.use(
      http.post('*/admin/suppliers/:id/import', () =>
        HttpResponse.json({ created: 3, updated: 0, unchanged: 0 }),
      ),
    );
    const { dialog } = await openFlow();
    await turnOn(user, await toFinish(user, dialog, '3'));
    await user.click(dialog.getByRole('button', { name: 'Start' }));

    expect(
      await dialog.findByText(
        '3 services added, but the server did not say which, so no shop preview was prepared.',
      ),
    ).toBeInTheDocument();
    expect(publishCalls(requests)).toHaveLength(0);
  });
});

describe('a long list', () => {
  it('keeps the first batch and its shop preview when the second fails, and goes on without sending the first again', async () => {
    const user = userEvent.setup();
    await addNotImported(1, 600); // 603 services not imported yet: batches of 500 and 103
    const requests = recordRequests();
    const runs = answerRuns();
    let calls = 0;
    mockServer.use(
      http.post('*/admin/suppliers/:id/import', () => {
        calls += 1;
        // The second call fails; the first and the retry go through to the dev mock.
        return calls === 2
          ? problem(
              409,
              'SYNC_NEEDED',
              'Sync first',
              'The service list is older than a day. Sync Nordic GSM first.',
            )
          : undefined;
      }),
    );
    const { dialog, onDone } = await openFlow();
    await turnOn(user, await toFinish(user, dialog, '603'));
    await user.click(dialog.getByRole('button', { name: 'Start' }));

    // The first batch is kept: its counts, its ids and its shop preview are on screen beside the error.
    expect(
      await dialog.findByText(
        '500 of 603 services were added before it stopped. The service list is older than a day. Sync Nordic GSM first.',
      ),
    ).toBeInTheDocument();
    expect(dialog.getByText('500 services added')).toBeInTheDocument();
    expect(dialog.getByText('Batch 1 of 2: A shop preview is ready for 500 services.')).toBeInTheDocument();
    expect(dialog.getAllByRole('link', { name: 'Review and publish' })).toHaveLength(1);
    expect(runs.map((run) => run.scope.serviceIds.length)).toEqual([500]);
    // A stop that may pass says "Continue"; Back and Close are there too.
    expect(
      dialog.getByText(/Some services were added\. Continue to do the rest, or go back/),
    ).toBeInTheDocument();
    expect(dialog.getByRole('button', { name: 'Back' })).toBeEnabled();
    // The footer's Close and the dialog's own close button.
    for (const close of dialog.getAllByRole('button', { name: 'Close' })) expect(close).toBeEnabled();
    expect(dialog.getByRole('switch', { name: SWITCH })).toBeDisabled();
    await waitFor(() => expect(onDone).toHaveBeenCalledTimes(1));

    await user.click(dialog.getByRole('button', { name: 'Continue adding (103 left)' }));
    expect(await dialog.findByText('603 services added')).toBeInTheDocument();
    expect(dialog.getByText('Batch 2 of 2: A shop preview is ready for 103 services.')).toBeInTheDocument();
    expect(dialog.getAllByRole('link', { name: 'Review and publish' })).toHaveLength(2);
    // The first batch was sent once: 500, the failed 103, the retried 103. One preview per batch, 500 and 103 services, none twice.
    expect(
      importCalls(requests).map(
        (call) => (call.body as { supplierServiceIds: number[] }).supplierServiceIds.length,
      ),
    ).toEqual([500, 103, 103]);
    expect(runs.map((run) => run.scope.serviceIds.length)).toEqual([500, 103]);
    expect(new Set(runs.flatMap((run) => run.scope.serviceIds)).size).toBe(603);
    expect(dialog.getByRole('button', { name: 'Done' })).toBeInTheDocument();
    expect(onDone).toHaveBeenCalledTimes(1);
  });
});

describe('while a long list goes', () => {
  it('says it is adding, not that the person should continue, until the run has stopped or ended', async () => {
    const user = userEvent.setup();
    await addNotImported(1, 600);
    answerRuns();
    let release: () => void = () => undefined;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    let calls = 0;
    mockServer.use(
      http.post('*/admin/suppliers/:id/import', async () => {
        calls += 1;
        // The second batch waits: the first batch's answer is on screen while the run is still going.
        if (calls === 2) await gate;
        return undefined;
      }),
    );
    const { dialog } = await openFlow();
    await turnOn(user, await toFinish(user, dialog, '603'));
    await user.click(dialog.getByRole('button', { name: 'Start' }));

    expect(
      await dialog.findByRole('button', { name: 'Adding 603 of 603…' }, { timeout: 10_000 }),
    ).toBeDisabled();
    await dialog.findByText('500 services added');
    expect(
      dialog.getByText(/Adding the services\. Keep this window open until it ends\./),
    ).toBeInTheDocument();
    expect(dialog.queryByText(/Continue to do the rest/)).not.toBeInTheDocument();
    expect(dialog.queryByText(/Some services were/)).not.toBeInTheDocument();

    release();
    expect(await dialog.findByText('603 services added')).toBeInTheDocument();
    expect(dialog.getByText(/Done\./)).toBeInTheDocument();
  });
});

describe('a batch the server refuses for good', () => {
  const REFUSAL = 'Bulk 0555 has a type the server cannot import. Nothing was imported.';

  /** The second import call is refused with a 422 naming a service; the first and the later ones go through to the dev mock. */
  function refuseSecondBatch() {
    let calls = 0;
    mockServer.use(
      http.post('*/admin/suppliers/:id/import', () => {
        calls += 1;
        return calls === 2 ? problem(422, 'unsupported_type', 'Cannot import', REFUSAL) : undefined;
      }),
    );
  }

  it('goes back to the picks with the first batch kept, its services out of the picks, and the words that say what to untick', async () => {
    const user = userEvent.setup();
    await addNotImported(1, 600);
    const requests = recordRequests();
    const runs = answerRuns();
    refuseSecondBatch();
    const { dialog, onDone, onClose } = await openFlow();
    await turnOn(user, await toFinish(user, dialog, '603'));
    await user.click(dialog.getByRole('button', { name: 'Start' }));

    const stopText = `500 of 603 services were added before it stopped. ${REFUSAL} Go back, untick the services it names and preview again.`;
    expect(await dialog.findByText(stopText)).toBeInTheDocument();
    // Sending the same batch again gets the same refusal, so the subtitle sends the person back instead of to "Continue".
    expect(dialog.getByText(/The server refused the rest as picked: go back and untick/)).toBeInTheDocument();
    expect(dialog.getByRole('button', { name: 'Back' })).toBeEnabled();
    await waitFor(() => expect(onDone).toHaveBeenCalledTimes(1));

    await user.click(dialog.getByRole('button', { name: 'Back' }));
    // The picks again, without the 500 services the first batch brought in; the words of the stop stay.
    expect(await dialog.findByText('103 picked')).toBeInTheDocument();
    expect(dialog.getByRole('table', { name: 'Supplier services' })).toBeInTheDocument();
    expect(stepNow(dialog)).toContain('Prices and category');
    expect(dialog.getByText(stopText)).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
    // The first batch's result and its link to review and publish are still there.
    const kept = within(dialog.getByRole('region', { name: 'Already added' }));
    expect(kept.getByText('500 services added')).toBeInTheDocument();
    expect(kept.getByText('A shop preview is ready for 500 services.')).toBeInTheDocument();
    expect(kept.getByRole('link', { name: 'Review and publish' })).toHaveAttribute(
      'href',
      storefrontPublishPath(41),
    );

    // Preview the 103 left, add them: one result for both runs, numbered as one list of 603.
    await user.click(dialog.getByRole('button', { name: 'Preview (103)' }));
    await dialog.findByRole('table', { name: 'Import preview' });
    expect(dialog.queryByText(stopText)).not.toBeInTheDocument();
    await user.click(dialog.getByRole('button', { name: 'Next' }));
    await dialog.findByText('Ready to add 103 services from Nordic GSM: 103 new.');
    await user.click(dialog.getByRole('button', { name: 'Start' }));

    expect(await dialog.findByText('603 services added')).toBeInTheDocument();
    expect(dialog.getByText('Batch 1 of 2: A shop preview is ready for 500 services.')).toBeInTheDocument();
    expect(dialog.getByText('Batch 2 of 2: A shop preview is ready for 103 services.')).toBeInTheDocument();
    expect(dialog.getAllByRole('link', { name: 'Review and publish' })).toHaveLength(2);
    expect(dialog.getByRole('button', { name: 'Done' })).toBeInTheDocument();
    // The 500 were sent once; the refused 103 once; the 103 again after the picks were made again.
    expect(
      importCalls(requests).map(
        (call) => (call.body as { supplierServiceIds: number[] }).supplierServiceIds.length,
      ),
    ).toEqual([500, 103, 103]);
    expect(runs.map((run) => run.scope.serviceIds.length)).toEqual([500, 103]);
    expect(new Set(runs.flatMap((run) => run.scope.serviceIds)).size).toBe(603);
  });

  it('also goes back to the picks when the very first batch is refused, with Back, not Close', async () => {
    const user = userEvent.setup();
    mockServer.use(
      http.post('*/admin/suppliers/:id/import', () =>
        problem(422, 'unsupported_type', 'Cannot import', REFUSAL),
      ),
    );
    const { dialog } = await openFlow();
    await toFinish(user, dialog, '3');
    await user.click(dialog.getByRole('button', { name: 'Start' }));
    expect(
      await dialog.findByText(`${REFUSAL} Go back, untick the services it names and preview again.`),
    ).toBeInTheDocument();

    await user.click(dialog.getByRole('button', { name: 'Back' }));
    // Nothing went through, so the three picks are still all there, and there is no "Already added".
    expect(await dialog.findByText('3 picked')).toBeInTheDocument();
    expect(dialog.queryByRole('region', { name: 'Already added' })).not.toBeInTheDocument();
    expect(dialog.getByText(/Go back, untick the services it names/)).toBeInTheDocument();
  });
});

describe('a shop preview that could not be started', () => {
  /** The publish runs route fails with `first` for the first call, then answers a run (41) for each later one. */
  function failThenAnswer(first: () => Response | Promise<Response>) {
    const bodies: { scope: { kind: string; serviceIds: number[] } }[] = [];
    mockServer.use(
      http.post('*/admin/publish-runs', async ({ request }) => {
        bodies.push((await request.json()) as (typeof bodies)[number]);
        return bodies.length === 1
          ? first()
          : HttpResponse.json({ id: 40 + bodies.length, status: 'preparing' }, { status: 202 });
      }),
    );
    return bodies;
  }

  it('keeps the services and asks for the preview again with Try again, for the same ids', async () => {
    const user = userEvent.setup();
    const bodies = failThenAnswer(() =>
      problem(503, 'UNAVAILABLE', 'Unavailable', 'The shop is busy. Try again in a moment.'),
    );
    const { dialog } = await openFlow();
    await turnOn(user, await toFinish(user, dialog, '3'));
    await user.click(dialog.getByRole('button', { name: 'Start' }));

    expect(
      await dialog.findByText(
        'The shop preview for 3 services could not be started. The shop is busy. Try again in a moment.',
      ),
    ).toBeInTheDocument();
    expect(dialog.queryByRole('link', { name: 'Review and publish' })).not.toBeInTheDocument();

    await user.click(dialog.getByRole('button', { name: 'Try again' }));
    expect(await dialog.findByText('A shop preview is ready for 3 services.')).toBeInTheDocument();
    expect(dialog.getByRole('link', { name: 'Review and publish' })).toHaveAttribute(
      'href',
      storefrontPublishPath(42),
    );
    expect(dialog.queryByRole('button', { name: 'Try again' })).not.toBeInTheDocument();
    expect(dialog.queryByText(/could not be started/)).not.toBeInTheDocument();
    // Both calls are for the three services the import created, not for anything else of the supplier.
    expect(bodies).toHaveLength(2);
    expect(bodies[1]).toEqual(bodies[0]);
    expect(bodies[0].scope.serviceIds).toHaveLength(3);
    expect(dialog.getByRole('button', { name: 'Done' })).toBeInTheDocument();
  });

  it('shows the new refusal when asking again fails too, and goes on offering Try again', async () => {
    const user = userEvent.setup();
    let calls = 0;
    mockServer.use(
      http.post('*/admin/publish-runs', () => {
        calls += 1;
        return problem(503, 'UNAVAILABLE', 'Unavailable', `Busy, attempt ${calls}.`);
      }),
    );
    const { dialog } = await openFlow();
    await turnOn(user, await toFinish(user, dialog, '3'));
    await user.click(dialog.getByRole('button', { name: 'Start' }));
    await dialog.findByText(/Busy, attempt 1\./);
    await user.click(dialog.getByRole('button', { name: 'Try again' }));
    expect(await dialog.findByText(/Busy, attempt 2\./)).toBeInTheDocument();
    expect(dialog.queryByText(/Busy, attempt 1\./)).not.toBeInTheDocument();
    expect(dialog.getByRole('button', { name: 'Try again' })).toBeEnabled();
  });

  it('names the missing permission after a 403 and offers no Try again', async () => {
    const user = userEvent.setup();
    mockServer.use(
      http.post('*/admin/publish-runs', () =>
        problem(403, 'FORBIDDEN', 'Forbidden', 'You are not allowed to do this.'),
      ),
    );
    const { dialog } = await openFlow();
    await turnOn(user, await toFinish(user, dialog, '3'));
    await user.click(dialog.getByRole('button', { name: 'Start' }));

    expect(
      await dialog.findByText(
        'The shop preview for 3 services could not be started. You need the storefront:create permission.',
      ),
    ).toBeInTheDocument();
    expect(dialog.queryByText(/You are not allowed to do this/)).not.toBeInTheDocument();
    expect(dialog.queryByRole('button', { name: 'Try again' })).not.toBeInTheDocument();
    expect(dialog.getByText('3 services added')).toBeInTheDocument();
  });
});

describe('the switch’s locks', () => {
  it('is held back without storefront:create, names the permission, and the import still goes', async () => {
    const user = userEvent.setup();
    const requests = recordRequests();
    const { dialog } = await openFlow({ permissions: ['suppliers:read', 'catalog:read', 'catalog:create'] });
    const box = await toFinish(user, dialog, '3');
    expect(box).toBeDisabled();
    expect(box).toHaveAttribute('aria-checked', 'false');
    expect(box).toHaveAttribute('title', 'You need the storefront:create permission');
    expect(dialog.getByText('You need the storefront:create permission')).toBeInTheDocument();

    await user.click(dialog.getByRole('button', { name: 'Start' }));
    expect(await dialog.findByText('3 services added')).toBeInTheDocument();
    expect(publishCalls(requests)).toHaveLength(0);
  });

  it('is held back while no shop price rule is on, with a link to the rules', async () => {
    const user = userEvent.setup();
    mockServer.use(
      http.get('*/admin/retail-price-rules', () =>
        HttpResponse.json([], { headers: { 'x-total-count': '0' } }),
      ),
    );
    const { dialog, onClose } = await openFlow();
    const box = await toFinish(user, dialog, '3');
    await dialog.findByText(/^No shop price rule is switched on/);
    expect(box).toBeDisabled();
    const link = dialog.getByRole('link', { name: 'Open the shop price rules' });
    expect(link).toHaveAttribute('href', storefrontPricingPath());
    await user.click(link);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('is not held back for someone who cannot read the rules: the preview itself says which services have no price', async () => {
    const user = userEvent.setup();
    const requests = recordRequests();
    const { dialog } = await openFlow({
      permissions: ['suppliers:read', 'catalog:read', 'catalog:create', 'storefront:create'],
    });
    const box = await toFinish(user, dialog, '3');
    await waitFor(() => expect(box).toBeEnabled());
    expect(requests.sent().some((call) => call.url.pathname === '/admin/retail-price-rules')).toBe(false);
  });
});
