// Tests for the whole-groups path of the Add services flow, run against the suppliers mock API: the step line, the review, the shop
// switch and its locks, the body of the start, the run and its publish line, a run already going, refusals, and the closed dialog.
// Where a test needs a group list, a run or the rules the seed does not hold, it answers the route itself.
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { delay, http, HttpResponse } from 'msw';
import { Route } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { storefrontPricingPath } from '@/features/storefront';
import { mockServer } from '@/mocks/node';
import { problem } from '@/mocks/problem';
import { mockMe, renderShell, setupMockApi, signInAs } from '@/test/renderApp';
import { listSuppliers } from '../../api';
import { NO_RULE_REASON } from '../../lib/quickAddFlow';
import { PUBLISH_NEEDS_PERMISSION, PUBLISH_SWITCHED_OFF } from '../../lib/quickAddPublish';
import { mocks } from '../../mocks';
import type { QuickAddRun, ServiceGroup, Supplier } from '../../types';
import { GroupsFlowDialog } from './GroupsFlowDialog';

setupMockApi();
vi.setConfig({ testTimeout: 30_000 });

type User = ReturnType<typeof userEvent.setup>;
type Scope = ReturnType<typeof within>;

const SWITCH = 'Put them on the shop now';

const group = (type: string, remoteGroup: string, addable: number): ServiceGroup => ({
  type,
  remoteGroup,
  total: addable,
  addable,
  imported: 0,
  unavailable: 0,
  unsupported: 0,
});

const run = (changes: Partial<QuickAddRun> = {}): QuickAddRun => ({
  id: 9,
  supplierId: 1,
  scope: 'all',
  groups: [],
  serviceStatus: 'active',
  publish: 'none',
  status: 'queued',
  total: 5,
  processed: 0,
  created: 0,
  skipped: 0,
  failed: 0,
  categoriesCreated: 0,
  failures: [],
  error: null,
  requestedBy: 1,
  createdAt: new Date().toISOString(),
  startedAt: null,
  finishedAt: null,
  ...changes,
});

/** The run as it reads once it is over. */
const ended = (changes: Partial<QuickAddRun> = {}) =>
  run({
    status: 'succeeded',
    processed: 5,
    created: 5,
    startedAt: new Date().toISOString(),
    finishedAt: new Date().toISOString(),
    ...changes,
  });

/** The groups route answers these groups (Apple, 5 services, unless said) and the newest run of the supplier (none unless said). */
function stubGroups(
  groups: ServiceGroup[] = [group('imei', 'Apple', 5)],
  latestRun: QuickAddRun | null = null,
) {
  const sum = groups.reduce((total, row) => total + row.addable, 0);
  mockServer.use(
    http.get('*/admin/suppliers/:id/service-groups', () =>
      HttpResponse.json({
        groups,
        totals: { total: sum, addable: sum, imported: 0, unavailable: 0, unsupported: 0 },
        latestRun,
      }),
    ),
  );
}

// Every test starts with the suppliers mocks and one group, Apple; a test that needs other groups or a run answers the route itself.
beforeEach(() => {
  mockServer.use(...mocks.handlers);
  stubGroups();
});

/** The start is answered with `started` and every read of the run with `later`; `sent.body` keeps what the start was sent. */
function stubRun(sent: { body?: unknown }, started: QuickAddRun, later: QuickAddRun) {
  mockServer.use(
    http.post('*/admin/suppliers/:id/quick-add', async ({ request }) => {
      sent.body = await request.json();
      return HttpResponse.json(started, { status: 202 });
    }),
    http.get('*/admin/suppliers/:id/quick-add/:runId', () => HttpResponse.json(later)),
  );
}

/** The shop price rules route answers one active rule, or none; `reads` keeps the address of every read. */
function stubRules(active: boolean) {
  const reads: URL[] = [];
  mockServer.use(
    http.get('*/admin/retail-price-rules', ({ request }) => {
      reads.push(new URL(request.url));
      const rows = active ? [{ id: 1, scope: 'global', isActive: true, label: 'Every service +25%' }] : [];
      return HttpResponse.json(rows, { headers: { 'x-total-count': String(rows.length) } });
    }),
  );
  return reads;
}

/** The publish runs route knows no run yet (the server is still preparing it). */
function stubNoPublishRun() {
  mockServer.use(
    http.get('*/admin/publish-runs', () => HttpResponse.json([], { headers: { 'x-total-count': '0' } })),
  );
}

/** Opens the path as a staff member with these permissions (all of them by default) and returns the dialog and the callbacks. */
async function openFlow(permissions?: string[]) {
  await signInAs();
  if (permissions) mockMe({ id: 1, name: 'Rami K.', permissions });
  const { data } = await listSuppliers();
  const supplier = data.find((row) => row.name === 'Nordic GSM') as Supplier;
  const spies = { onBack: vi.fn(), onClose: vi.fn(), onDone: vi.fn() };
  renderShell(
    '/probe',
    <Route path="/probe" element={<GroupsFlowDialog supplier={supplier} {...spies} />} />,
  );
  const dialog = within(await screen.findByRole('dialog', { name: 'Add services' }));
  return { dialog, spies };
}

const press = (user: User, dialog: Scope, name: string | RegExp) =>
  user.click(dialog.getByRole('button', { name }));
const shopSwitch = (dialog: Scope) => dialog.getByRole('switch', { name: SWITCH });

/** Waits for the groups, ticks Apple and goes on to the last step. */
async function toFinish(user: User, dialog: Scope) {
  await user.click(await dialog.findByRole('checkbox', { name: 'Select Apple (IMEI)' }));
  await press(user, dialog, 'Next');
  await dialog.findByRole('radio', { name: /^On sale/ });
}

describe('the first step', () => {
  it('names the step line, shows the groups with no status and no shop choice, and Back goes to Where from', async () => {
    const user = userEvent.setup();
    stubRules(true);
    const { dialog, spies } = await openFlow();
    await dialog.findByRole('table', { name: 'Supplier groups' });

    const items = within(dialog.getByRole('list', { name: 'Steps' })).getAllByRole('listitem');
    expect(items).toHaveLength(3);
    expect(items[0]).toHaveTextContent('Done: Where from');
    expect(items[1]).toHaveAttribute('aria-current', 'step');
    expect(items[1]).toHaveTextContent('Prices and category');
    expect(items[2]).not.toHaveAttribute('aria-current');
    expect(dialog.queryByRole('group', { name: 'Add them as' })).not.toBeInTheDocument();
    expect(dialog.queryByRole('checkbox', { name: 'Also put them on the shop' })).not.toBeInTheDocument();
    expect(dialog.queryByRole('switch')).not.toBeInTheDocument();
    expect(dialog.getByRole('button', { name: 'Next' })).toBeDisabled();

    await press(user, dialog, 'Back');
    expect(spies.onBack).toHaveBeenCalledTimes(1);
    expect(spies.onClose).not.toHaveBeenCalled();
  });

  it('says what adding the picked groups does, in the words of the server, with a link to the rules', async () => {
    const user = userEvent.setup();
    stubRules(true);
    const { dialog } = await openFlow();
    expect(dialog.queryByRole('region', { name: 'What adding them does' })).not.toBeInTheDocument();
    await user.click(await dialog.findByRole('checkbox', { name: 'Select Apple (IMEI)' }));

    const review = within(await dialog.findByRole('region', { name: 'What adding them does' }));
    expect(review.getByText('This adds 5 services from all groups of Nordic GSM.')).toBeInTheDocument();
    expect(
      review.getByText('Category: named after the group. Missing categories are created.'),
    ).toBeInTheDocument();
    expect(
      review.getByText('Price for merchants: the supplier’s cost plus the default minimum profit.'),
    ).toBeInTheDocument();
    expect(review.getByText('Order fields and quantities are copied from the supplier.')).toBeInTheDocument();
    expect(await review.findByText(/A rule is active\./)).toBeInTheDocument();
    expect(review.getByRole('link', { name: 'Open the shop price rules' })).toHaveAttribute(
      'href',
      storefrontPricingPath(),
    );
    expect(dialog.getByRole('button', { name: 'Next' })).toBeEnabled();
  });

  it('says that no rule is active when none is', async () => {
    const user = userEvent.setup();
    stubRules(false);
    const { dialog } = await openFlow();
    await user.click(await dialog.findByRole('checkbox', { name: 'Select Apple (IMEI)' }));
    expect(await dialog.findByText(/No rule is active, so nothing can go on the shop/)).toBeInTheDocument();
  });
});

describe('the last step', () => {
  it('moves focus to the heading of the step, and a second press on Next cannot start the run', async () => {
    const user = userEvent.setup();
    const sent: { body?: unknown } = {};
    stubRules(true);
    stubRun(sent, run(), ended());
    const { dialog } = await openFlow();
    await user.click(await dialog.findByRole('checkbox', { name: 'Select Apple (IMEI)' }));
    const next = dialog.getByRole('button', { name: 'Next' });
    await user.dblClick(next);

    const heading = await dialog.findByRole('heading', { name: 'Finish: how to add them' });
    await waitFor(() => expect(heading).toHaveFocus());
    await dialog.findByRole('radio', { name: /^On sale/ });
    // Start is a button of its own, still waiting: the second press found no button and sent nothing.
    const start = dialog.getByRole('button', { name: 'Start' });
    expect(start).not.toBe(next);
    expect(start).toBeEnabled();
    expect(sent.body).toBeUndefined();
    expect(dialog.queryByText(/services added/)).not.toBeInTheDocument();
  });

  it('asks how to add them and has the shop switch on, with the step line on Finish', async () => {
    const user = userEvent.setup();
    stubRules(true);
    const { dialog, spies } = await openFlow();
    await toFinish(user, dialog);

    const items = within(dialog.getByRole('list', { name: 'Steps' })).getAllByRole('listitem');
    expect(items[1]).toHaveTextContent('Done: Prices and category');
    expect(items[2]).toHaveAttribute('aria-current', 'step');
    expect(dialog.getByText('Ready to add 5 services from all groups of Nordic GSM.')).toBeInTheDocument();
    expect(dialog.getByRole('radio', { name: /^On sale/ })).toBeChecked();
    expect(dialog.getByRole('radio', { name: /^Switched off/ })).not.toBeChecked();
    await waitFor(() => expect(shopSwitch(dialog)).toBeChecked());
    expect(shopSwitch(dialog)).toBeEnabled();
    expect(dialog.getByRole('button', { name: 'Start' })).toBeEnabled();

    // Back keeps the picks; it does not leave the flow.
    await press(user, dialog, 'Back');
    expect(await dialog.findByRole('checkbox', { name: 'Select Apple (IMEI)' })).toBeChecked();
    expect(spies.onBack).not.toHaveBeenCalled();
  });

  it('locks the switch, with the reason in words and in its title, for services added switched off', async () => {
    const user = userEvent.setup();
    const sent: { body?: unknown } = {};
    stubRules(true);
    stubRun(sent, run(), ended());
    const { dialog } = await openFlow();
    await toFinish(user, dialog);
    await waitFor(() => expect(shopSwitch(dialog)).toBeChecked());

    await user.click(dialog.getByRole('radio', { name: /^Switched off/ }));
    expect(shopSwitch(dialog)).toBeDisabled();
    expect(shopSwitch(dialog)).not.toBeChecked();
    expect(shopSwitch(dialog)).toHaveAttribute('title', PUBLISH_SWITCHED_OFF);
    expect(dialog.getByText(PUBLISH_SWITCHED_OFF)).toBeInTheDocument();

    await press(user, dialog, 'Start');
    await waitFor(() => expect(sent.body).toEqual({ scope: 'all', serviceStatus: 'disabled' }));
  });

  it('turns the switch back on with On sale, as the default says', async () => {
    const user = userEvent.setup();
    stubRules(true);
    const { dialog } = await openFlow();
    await toFinish(user, dialog);
    await waitFor(() => expect(shopSwitch(dialog)).toBeChecked());
    await user.click(dialog.getByRole('radio', { name: /^Switched off/ }));
    await user.click(dialog.getByRole('radio', { name: /^On sale/ }));
    expect(shopSwitch(dialog)).toBeEnabled();
    expect(shopSwitch(dialog)).toBeChecked();
    expect(shopSwitch(dialog)).not.toHaveAttribute('title');
  });

  it('keeps it off and locked while no shop price rule is active, with a link to the rules', async () => {
    const user = userEvent.setup();
    stubRules(false);
    const { dialog } = await openFlow();
    await toFinish(user, dialog);

    await waitFor(() => expect(shopSwitch(dialog)).toBeDisabled());
    expect(shopSwitch(dialog)).not.toBeChecked();
    expect(shopSwitch(dialog)).toHaveAttribute('title', NO_RULE_REASON);
    expect(dialog.getByRole('link', { name: 'Open the shop price rules' })).toHaveAttribute(
      'href',
      storefrontPricingPath(),
    );
  });

  it('is locked for a role without storefront:publish, and names the permission', async () => {
    const user = userEvent.setup();
    stubRules(true);
    const { dialog } = await openFlow(['suppliers:read', 'catalog:create', 'pricing:read']);
    await toFinish(user, dialog);
    expect(shopSwitch(dialog)).toBeDisabled();
    expect(shopSwitch(dialog)).not.toBeChecked();
    expect(shopSwitch(dialog)).toHaveAttribute('title', PUBLISH_NEEDS_PERMISSION);
  });

  it('is off but not locked for a role that cannot read the rules, and asks the rules nothing', async () => {
    const user = userEvent.setup();
    const reads = stubRules(true);
    const { dialog } = await openFlow(['suppliers:read', 'catalog:create', 'storefront:publish']);
    await toFinish(user, dialog);
    expect(shopSwitch(dialog)).toBeEnabled();
    expect(shopSwitch(dialog)).not.toBeChecked();
    expect(reads).toHaveLength(0);
  });

  it('keeps the permission hint on Start: disabled, with the missing permission as its title', async () => {
    const user = userEvent.setup();
    stubRules(true);
    const { dialog } = await openFlow(['suppliers:read', 'pricing:read']);
    await toFinish(user, dialog);
    const start = dialog.getByRole('button', { name: 'Start' });
    expect(start).toBeDisabled();
    expect(start).toHaveAttribute('title', 'You need the catalog:create permission');
  });
});

describe('the run', () => {
  it('sends only the scope and the shop request, follows the run and tells the page once it ended', async () => {
    const user = userEvent.setup();
    const sent: { body?: unknown } = {};
    stubRules(true);
    stubNoPublishRun();
    stubRun(sent, run({ publish: 'listed' }), ended({ publish: 'listed' }));
    const { dialog, spies } = await openFlow();
    await toFinish(user, dialog);
    await waitFor(() => expect(shopSwitch(dialog)).toBeChecked());
    await press(user, dialog, 'Start');

    await waitFor(() => expect(sent.body).toEqual({ scope: 'all', publish: { listed: true } }));
    expect(await dialog.findByText('5 services added', {}, { timeout: 5_000 })).toBeInTheDocument();
    await waitFor(() =>
      expect(dialog.getByText('Publishing to the shop:').closest('p')).toHaveTextContent('preparing'),
    );
    expect(within(dialog.getByRole('list', { name: 'Steps' })).getAllByRole('listitem')[2]).toHaveAttribute(
      'aria-current',
      'step',
    );
    await waitFor(() => expect(spies.onDone).toHaveBeenCalledTimes(1));

    // Add more: back on the groups with the picks cleared.
    await press(user, dialog, 'Add more');
    expect(await dialog.findByRole('table', { name: 'Supplier groups' })).toBeInTheDocument();
    expect(dialog.getByRole('button', { name: 'Next' })).toBeDisabled();
    expect(spies.onDone).toHaveBeenCalledTimes(1);
  });

  it('cannot be closed or left while the start request is on its way', async () => {
    const user = userEvent.setup();
    stubRules(true);
    mockServer.use(
      http.post('*/admin/suppliers/:id/quick-add', async () => {
        await delay(400);
        return HttpResponse.json(run(), { status: 202 });
      }),
      http.get('*/admin/suppliers/:id/quick-add/:runId', () => HttpResponse.json(ended())),
    );
    const { dialog, spies } = await openFlow();
    await toFinish(user, dialog);
    await press(user, dialog, 'Start');

    await waitFor(() => expect(dialog.getByRole('button', { name: 'Close' })).toBeDisabled());
    expect(dialog.getByRole('button', { name: 'Back' })).toBeDisabled();
    expect(await dialog.findByText('5 services added', {}, { timeout: 5_000 })).toBeInTheDocument();
    expect(spies.onClose).not.toHaveBeenCalled();
  });

  it('opens on the progress of a run that is still going, with no way to pick again', async () => {
    const going = run({ status: 'running', processed: 2, created: 2 });
    stubRules(true);
    stubGroups([group('imei', 'Apple', 5)], going);
    mockServer.use(http.get('*/admin/suppliers/:id/quick-add/:runId', () => HttpResponse.json(going)));
    const { dialog } = await openFlow();

    expect(await dialog.findByText('2 of 5 services, 2 added')).toBeInTheDocument();
    expect(dialog.getByText(/It keeps running after you close this/)).toBeInTheDocument();
    expect(dialog.queryByRole('button', { name: 'Next' })).not.toBeInTheDocument();
    expect(dialog.queryByRole('table', { name: 'Supplier groups' })).not.toBeInTheDocument();
    expect(within(dialog.getByRole('list', { name: 'Steps' })).getAllByRole('listitem')[2]).toHaveAttribute(
      'aria-current',
      'step',
    );
  });

  it('opens on the groups when the newest run is over', async () => {
    stubRules(true);
    stubGroups([group('imei', 'Apple', 5)], ended());
    const { dialog, spies } = await openFlow();
    expect(await dialog.findByRole('table', { name: 'Supplier groups' })).toBeInTheDocument();
    expect(dialog.getByRole('button', { name: 'Next' })).toBeInTheDocument();
    expect(spies.onDone).not.toHaveBeenCalled();
  });
});

describe('what the server refuses', () => {
  it('says no rule is active with a link to the rules, and stays on the last step', async () => {
    const user = userEvent.setup();
    stubRules(true);
    mockServer.use(
      http.post('*/admin/suppliers/:id/quick-add', () =>
        problem(422, 'VALIDATION_FAILED', 'Check the form', 'Some fields need attention.', [
          { field: 'publish', message: 'Set a retail pricing rule first.' },
        ]),
      ),
    );
    const { dialog } = await openFlow();
    await toFinish(user, dialog);
    await waitFor(() => expect(shopSwitch(dialog)).toBeChecked());
    await press(user, dialog, 'Start');

    const alert = (await dialog.findByText(/Set a retail pricing rule first\./)).closest('p') as HTMLElement;
    expect(alert).toHaveAttribute('role', 'alert');
    expect(within(alert).getByRole('link', { name: 'Open Retail pricing' })).toHaveAttribute(
      'href',
      storefrontPricingPath(),
    );
    expect(dialog.getByRole('button', { name: 'Start' })).toBeInTheDocument();
  });

  it('goes back to the groups with the server’s words when nothing is left to add', async () => {
    const user = userEvent.setup();
    stubRules(true);
    mockServer.use(
      http.post('*/admin/suppliers/:id/quick-add', () =>
        problem(422, 'VALIDATION_FAILED', 'Check the form', 'Some fields need attention.', [
          { field: 'scope', message: 'Nothing to add.' },
        ]),
      ),
    );
    const { dialog } = await openFlow();
    await toFinish(user, dialog);
    await press(user, dialog, 'Start');

    expect(await dialog.findByText('Nothing to add.')).toBeInTheDocument();
    expect(await dialog.findByRole('table', { name: 'Supplier groups' })).toBeInTheDocument();
    expect(dialog.queryByRole('link', { name: 'Open Retail pricing' })).not.toBeInTheDocument();
  });

  it('shows the run that is already going when another one holds the supplier', async () => {
    const user = userEvent.setup();
    const going = run({ id: 4, status: 'running', processed: 1, created: 1 });
    stubRules(true);
    mockServer.use(
      http.post('*/admin/suppliers/:id/quick-add', () =>
        problem(409, 'JOB_ALREADY_RUNNING', 'A quick add is already running', 'A quick add is running.'),
      ),
      http.get('*/admin/suppliers/:id/quick-add/:runId', () => HttpResponse.json(going)),
    );
    const { dialog } = await openFlow();
    await toFinish(user, dialog);
    // The groups read after the refusal now carries the live run.
    stubGroups([group('imei', 'Apple', 5)], going);
    await press(user, dialog, 'Start');
    expect(await dialog.findByText('1 of 5 services, 1 added')).toBeInTheDocument();
  });
});
