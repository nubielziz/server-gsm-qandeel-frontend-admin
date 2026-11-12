// Tests for "Quick add…" on the Services panel, run through the whole app against the feature's mock API: the button and its
// lock, the three steps (groups, review, progress), what each pick sends, the refusals of the server and the empty states. Where a
// test needs a group list or a run the seed does not hold, it answers the route itself.
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mockServer } from '@/mocks/node';
import { problem } from '@/mocks/problem';
import { setupMockApi } from '@/test/renderApp';
import { getQuickAddRun, startQuickAdd } from '../api';
import { mocks, suppliersState } from '../mocks';
import { detailOf, openSuppliers, toasts } from '../test/suppliersPage';
import type { QuickAddRun, ServiceGroup } from '../types';

setupMockApi();
vi.setConfig({ testTimeout: 30_000 });
beforeEach(() => mockServer.use(...mocks.handlers));

type User = ReturnType<typeof userEvent.setup>;
type Scope = ReturnType<typeof within>;

/** A group of a made-up listing: everything in it can be added unless `other` says it is in the console already. */
const group = (type: string, remoteGroup: string, addable: number, other = 0): ServiceGroup => ({
  type,
  remoteGroup,
  total: addable + other,
  addable,
  imported: other,
  unavailable: 0,
  unsupported: 0,
});

const run = (changes: Partial<QuickAddRun> = {}): QuickAddRun => ({
  id: 9,
  supplierId: 1,
  scope: 'groups',
  groups: [],
  serviceStatus: 'active',
  status: 'queued',
  total: 10,
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

/** The answer of the groups route for these groups, with the totals worked out from them. */
function listing(groups: ServiceGroup[], latestRun: QuickAddRun | null = null) {
  const sum = (key: 'total' | 'addable' | 'imported' | 'unavailable' | 'unsupported') =>
    groups.reduce((total, row) => total + row[key], 0);
  const totals = {
    total: sum('total'),
    addable: sum('addable'),
    imported: sum('imported'),
    unavailable: sum('unavailable'),
    unsupported: sum('unsupported'),
  };
  return { groups, totals, latestRun };
}

const stubGroups = (groups: ServiceGroup[], latestRun: QuickAddRun | null = null) =>
  mockServer.use(
    http.get('*/admin/suppliers/:id/service-groups', () => HttpResponse.json(listing(groups, latestRun))),
  );

/** Answers the start with `started` and every read of the run with `later`; `sent.body` keeps what the start was sent. */
function stubRun(sent: { body?: unknown }, started: QuickAddRun, later: QuickAddRun) {
  mockServer.use(
    http.post('*/admin/suppliers/:id/quick-add', async ({ request }) => {
      sent.body = await request.json();
      return HttpResponse.json(started, { status: 202 });
    }),
    http.get('*/admin/suppliers/:id/quick-add/:runId', () => HttpResponse.json(later)),
  );
}

async function openQuickAdd(user: User, route = '/suppliers', name = 'Nordic GSM') {
  await openSuppliers(route);
  const detail = await detailOf(name);
  await user.click(await detail.findByRole('button', { name: 'Quick add…' }));
  const dialog = within(await screen.findByRole('dialog', { name: `Quick add from ${name}` }));
  return { detail, dialog };
}

/** Opens the dialog and waits for the groups table. */
async function openGroups(user: User, route?: string, name?: string) {
  const opened = await openQuickAdd(user, route, name);
  await opened.dialog.findByRole('table', { name: 'Supplier groups' });
  return opened;
}

const tick = (user: User, dialog: Scope, label: string) =>
  user.click(dialog.getByRole('checkbox', { name: label }));
const press = (user: User, dialog: Scope, name: string | RegExp) =>
  user.click(dialog.getByRole('button', { name }));
/** The footer's Close (the header's cross has the same name). */
const footerClose = (dialog: Scope) => dialog.getAllByRole('button', { name: 'Close' }).at(-1) as HTMLElement;
const cellsOf = (table: Scope, name: string) =>
  within(table.getByText(name).closest('tr') as HTMLElement)
    .getAllByRole('cell')
    .map((cell) => cell.textContent);

describe('the button', () => {
  it('sits before Import services… and is locked without the permission to create services', async () => {
    await openSuppliers('/suppliers', { permissions: ['suppliers:read'] });
    const detail = await detailOf('Nordic GSM');
    const button = await detail.findByRole('button', { name: 'Quick add…' });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('title', 'You need the catalog:create permission');
    const [first, second] = detail.getAllByRole('button', { name: /^(Quick add|Import services)…$/ });
    expect([first, second]).toEqual([button, detail.getByRole('button', { name: 'Import services…' })]);
  });

  it('is in the empty state too, next to Import services…, when no service uses the supplier', async () => {
    const state = await suppliersState();
    state.links = state.links.filter(
      (link) => state.catalogue.find(link.supplierServiceId)?.supplierId !== 1,
    );
    await openSuppliers();
    const detail = await detailOf('Nordic GSM');
    expect(await detail.findByText('No services use this supplier')).toBeInTheDocument();
    expect(detail.getAllByRole('button', { name: 'Quick add…' })).toHaveLength(1);
    expect(detail.getAllByRole('button', { name: 'Import services…' })).toHaveLength(1);
  });
});

describe('the groups', () => {
  it('lists every group with what it can add, and disables a group with nothing to add', async () => {
    const user = userEvent.setup();
    const { dialog } = await openGroups(user);
    expect(
      dialog.getByText(
        "Add whole groups of this supplier's services at once. Only services that are not in the console yet are added.",
      ),
    ).toBeInTheDocument();
    const table = within(dialog.getByRole('table', { name: 'Supplier groups' }));
    expect(table.getAllByRole('row')).toHaveLength(9); // the header and 8 groups
    expect(cellsOf(table, 'USA')).toEqual(['', 'USA IMEI', '1', '0', '–']);
    expect(cellsOf(table, 'Apple')).toEqual(['', 'Apple IMEI', '0', '4', '–']);
    // The service the supplier no longer lists counts under "Cannot add", with the reason in the title.
    expect(cellsOf(table, 'Canada')).toEqual(['', 'Canada IMEI', '0', '0', '1']);
    expect(
      table.getByTitle('1 no longer listed by the supplier, 0 of a type the console cannot sell'),
    ).toBeInTheDocument();
    expect(dialog.getByRole('checkbox', { name: 'Select Canada (IMEI)' })).toBeDisabled();
    expect(dialog.getByRole('checkbox', { name: 'Select Apple (IMEI)' })).toBeDisabled();
    expect(dialog.getByRole('checkbox', { name: 'Select USA (IMEI)' })).toBeEnabled();
    expect(dialog.getByText('0 groups picked, 0 services to add')).toBeInTheDocument();
    expect(dialog.getByRole('button', { name: 'Review' })).toBeDisabled();
    expect(dialog.getByRole('radio', { name: /^On sale/ })).toBeChecked();
    expect(dialog.getByRole('radio', { name: /^Switched off/ })).not.toBeChecked();
  });

  it('searches the groups in the browser, and Enter does not leave the step', async () => {
    const user = userEvent.setup();
    const { dialog } = await openGroups(user);
    const table = within(dialog.getByRole('table', { name: 'Supplier groups' }));
    await user.type(dialog.getByRole('searchbox', { name: 'Search groups' }), 'aus{Enter}');
    expect(table.getAllByRole('row')).toHaveLength(2);
    expect(table.getByText('Australia')).toBeInTheDocument();
    await user.clear(dialog.getByRole('searchbox', { name: 'Search groups' }));
    await user.type(dialog.getByRole('searchbox', { name: 'Search groups' }), 'zzz');
    expect(dialog.getByText('No group matches the search.')).toBeInTheDocument();
    expect(dialog.getByRole('button', { name: 'Review' })).toBeInTheDocument();
  });

  it('ticks only the shown groups that have something to add, with a dash when some are ticked', async () => {
    const user = userEvent.setup();
    const { dialog } = await openGroups(user);
    const all = dialog.getByRole('checkbox', { name: 'Select all groups' }) as HTMLInputElement;
    await tick(user, dialog, 'Select USA (IMEI)');
    expect(all.indeterminate).toBe(true);
    expect(dialog.getByText('1 group picked, 1 service to add')).toBeInTheDocument();
    await user.click(all);
    expect(all.checked).toBe(true);
    expect(dialog.getByText('2 groups picked, 2 services to add')).toBeInTheDocument();
    expect(dialog.getByRole('checkbox', { name: 'Select Canada (IMEI)' })).not.toBeChecked();
    await user.click(all);
    expect(dialog.getByText('0 groups picked, 0 services to add')).toBeInTheDocument();
  });
});

describe('what the picks send', () => {
  it('sends the scope all when every group with something to add is picked, then follows the run to its end', async () => {
    const user = userEvent.setup();
    let sent: unknown;
    mockServer.use(
      // A clone, so the body is still there for the mock route this handler passes the request on to.
      http.post('*/admin/suppliers/:id/quick-add', async ({ request }) => {
        sent = await request.clone().json();
        return undefined;
      }),
    );
    const { detail, dialog } = await openGroups(user);
    await user.click(dialog.getByRole('checkbox', { name: 'Select all groups' }));
    await press(user, dialog, 'Review');

    expect(dialog.getByText('This adds 2 services from all groups of Nordic GSM.')).toBeInTheDocument();
    expect(dialog.getByText('They are added on sale.')).toBeInTheDocument();
    expect(
      dialog.getByText(/^Price: the supplier.s cost plus the default minimum profit\./),
    ).toBeInTheDocument();
    const listed = within(dialog.getByRole('list', { name: 'Groups to add' }));
    expect(listed.getAllByRole('listitem')).toHaveLength(2);
    expect(dialog.queryByRole('checkbox')).not.toBeInTheDocument(); // 2 services need no tick box
    await press(user, dialog, 'Add 2 services');

    expect(sent).toEqual({ scope: 'all' });
    // The footer keeps only Close (and the note) while the run goes on.
    expect(
      await dialog.findByRole('meter', { name: 'Quick add progress' }, { timeout: 5_000 }),
    ).toBeInTheDocument();
    expect(dialog.getByText('1 of 2 services, 1 added')).toBeInTheDocument();
    expect(
      dialog.getByText('It keeps running after you close this. Open Quick add again to see it.'),
    ).toBeInTheDocument();
    expect(dialog.queryByRole('button', { name: 'Add more' })).not.toBeInTheDocument();

    expect(await dialog.findByText('2 services added', {}, { timeout: 5_000 })).toBeInTheDocument();
    expect(dialog.getByText('2 categories created')).toBeInTheDocument();
    expect(await toasts().findByText('2 services added from Nordic GSM')).toBeInTheDocument();
    // The supplier's Services table behind the dialog follows: 14 services and the 2 new ones.
    const table = within(await detail.findByRole('table', { name: 'Services using Nordic GSM' }));
    await waitFor(() => expect(table.getAllByRole('row')).toHaveLength(17));

    // Add more goes back to the groups, read again: nothing is left to add, and the last run is told.
    await press(user, dialog, 'Add more');
    expect(await dialog.findByText('Nothing to add')).toBeInTheDocument();
    expect(
      dialog.getByText('Everything this supplier lists is already in the console, or cannot be added.'),
    ).toBeInTheDocument();
    expect(dialog.getByText('Last quick add just now: 2 added')).toBeInTheDocument();
    await user.click(footerClose(dialog));
    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: /Quick add from/ })).not.toBeInTheDocument(),
    );
  });

  it('names the picked groups when some are left out, with the type of each', async () => {
    const user = userEvent.setup();
    const sent: { body?: unknown } = {};
    stubGroups([group('imei', 'Apple', 3), group('imei', 'Samsung', 4), group('server', 'Apple', 2)]);
    stubRun(sent, run({ total: 5 }), run({ total: 5, status: 'succeeded', processed: 5, created: 5 }));
    const { dialog } = await openGroups(user);
    await tick(user, dialog, 'Select Apple (IMEI)');
    await tick(user, dialog, 'Select Apple (SERVER)');
    expect(dialog.getByText('2 groups picked, 5 services to add')).toBeInTheDocument();
    await press(user, dialog, 'Review');
    expect(dialog.getByText('This adds 5 services from 2 groups of Nordic GSM.')).toBeInTheDocument();
    await press(user, dialog, 'Add 5 services');
    expect(sent.body).toEqual({
      scope: 'groups',
      groups: [
        { type: 'imei', remoteGroup: 'Apple' },
        { type: 'server', remoteGroup: 'Apple' },
      ],
    });
    expect(await dialog.findByText('5 services added', {}, { timeout: 5_000 })).toBeInTheDocument();
  });

  it('adds the services switched off when Switched off is chosen, and the review says so', async () => {
    const user = userEvent.setup();
    let sent: unknown;
    mockServer.use(
      http.post('*/admin/suppliers/:id/quick-add', async ({ request }) => {
        sent = await request.clone().json();
        return undefined;
      }),
    );
    const { dialog } = await openGroups(user);
    await tick(user, dialog, 'Select USA (IMEI)');
    await user.click(dialog.getByRole('radio', { name: /^Switched off/ }));
    await press(user, dialog, 'Review');
    expect(dialog.getByText('This adds 1 service from 1 group of Nordic GSM.')).toBeInTheDocument();
    expect(dialog.getByText('They are added switched off.')).toBeInTheDocument();
    // Back keeps the pick and the choice.
    await press(user, dialog, 'Back');
    expect(await dialog.findByText('1 group picked, 1 service to add')).toBeInTheDocument();
    expect(dialog.getByRole('radio', { name: /^Switched off/ })).toBeChecked();
    await press(user, dialog, 'Review');
    await press(user, dialog, 'Add 1 service');
    expect(sent).toEqual({
      scope: 'groups',
      groups: [{ type: 'imei', remoteGroup: 'USA' }],
      serviceStatus: 'disabled',
    });
    const state = await suppliersState();
    expect(state.services.list().find((service) => service.code.startsWith('IMP-'))?.status).toBe('disabled');
  });

  it('asks for a tick box above 500 services, and stops at 500 groups that are not all of them', async () => {
    const user = userEvent.setup();
    const many = Array.from({ length: 502 }, (_, index) =>
      group('imei', `G${String(index).padStart(3, '0')}`, 1),
    );
    stubGroups(many);
    const { dialog } = await openGroups(user);
    await user.click(dialog.getByRole('checkbox', { name: 'Select all groups' }));
    await tick(user, dialog, 'Select G000 (IMEI)');
    expect(dialog.getByText('501 groups picked, 501 services to add')).toBeInTheDocument();
    expect(dialog.getByText('Pick at most 500 groups, or select all.')).toBeInTheDocument();
    expect(dialog.getByRole('button', { name: 'Review' })).toBeDisabled();

    await tick(user, dialog, 'Select G000 (IMEI)');
    expect(dialog.queryByText('Pick at most 500 groups, or select all.')).not.toBeInTheDocument();
    await press(user, dialog, 'Review');
    expect(dialog.getByText('This adds 502 services from all groups of Nordic GSM.')).toBeInTheDocument();
    expect(dialog.getByText('+492 more')).toBeInTheDocument();
    const add = dialog.getByRole('button', { name: 'Add 502 services' });
    expect(add).toBeDisabled();
    await user.click(dialog.getByRole('checkbox', { name: 'I checked the groups. Add 502 services.' }));
    expect(add).toBeEnabled();
  });

  it('needs no tick box for exactly 500 services', async () => {
    const user = userEvent.setup();
    stubGroups([group('imei', 'Apple', 500), group('imei', 'Samsung', 1)]);
    const { dialog } = await openGroups(user);
    await tick(user, dialog, 'Select Apple (IMEI)');
    await press(user, dialog, 'Review');
    expect(dialog.getByRole('button', { name: 'Add 500 services' })).toBeEnabled();
    expect(dialog.queryByRole('checkbox')).not.toBeInTheDocument();
  });
});

describe('the run', () => {
  it('shows a run that stopped: the server’s words, the counts, the services it could not add, and how to go on', async () => {
    const user = userEvent.setup();
    const sent: { body?: unknown } = {};
    stubGroups([group('imei', 'Apple', 30), group('imei', 'Samsung', 4)]);
    stubRun(
      sent,
      run({ total: 30 }),
      run({
        total: 30,
        status: 'failed',
        processed: 24,
        created: 3,
        skipped: 1,
        failed: 20,
        failures: [{ supplierServiceId: 5, name: 'Bad Entry 5', reason: 'services_cost_check' }],
        error: 'Too many services could not be added (20). The rest was not tried.',
      }),
    );
    const { dialog } = await openGroups(user);
    await tick(user, dialog, 'Select Apple (IMEI)');
    await press(user, dialog, 'Review');
    await press(user, dialog, 'Add 30 services');

    expect(
      await dialog.findByText(
        'Too many services could not be added (20). The rest was not tried.',
        {},
        { timeout: 5_000 },
      ),
    ).toBeInTheDocument();
    expect(dialog.getByText('3 services added')).toBeInTheDocument();
    expect(dialog.getByText('1 skipped (already in the console or no longer available)')).toBeInTheDocument();
    expect(dialog.getByText('20 could not be added')).toBeInTheDocument();
    expect(
      within(dialog.getByRole('list', { name: 'Services that could not be added' })).getByText('Bad Entry 5'),
    ).toBeInTheDocument();
    expect(dialog.getByText('Start it again: it continues with what is left.')).toBeInTheDocument();
    expect(toasts().queryByText(/added from Nordic GSM/)).not.toBeInTheDocument();

    // Back to groups keeps the pick, so starting again is Review and Add.
    await press(user, dialog, 'Back to groups');
    expect(await dialog.findByText('1 group picked, 30 services to add')).toBeInTheDocument();
    expect(dialog.getByRole('button', { name: 'Review' })).toBeEnabled();
  });

  it('opens on the progress of a run that is already going', async () => {
    const user = userEvent.setup();
    const going = run({ status: 'running', total: 10, processed: 3, created: 3 });
    stubGroups([group('imei', 'Apple', 5)], going);
    mockServer.use(http.get('*/admin/suppliers/:id/quick-add/:runId', () => HttpResponse.json(going)));
    const { dialog } = await openQuickAdd(user);

    const meter = await dialog.findByRole('meter', { name: 'Quick add progress' });
    expect(meter).toHaveAttribute('aria-valuenow', '30');
    expect(dialog.getByText('3 of 10 services, 3 added')).toBeInTheDocument();
    expect(dialog.queryByRole('table', { name: 'Supplier groups' })).not.toBeInTheDocument();
    await user.click(footerClose(dialog));
    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: /Quick add from/ })).not.toBeInTheDocument(),
    );
  });

  it('opens on the groups, with a line about the last run, when the newest run is over', async () => {
    const user = userEvent.setup();
    const over = run({
      status: 'failed',
      error: 'The run stopped before it finished. Start it again: it continues with what is left.',
      createdAt: new Date(Date.now() - 3 * 3_600_000).toISOString(),
    });
    stubGroups([group('imei', 'Apple', 5)], over);
    const { dialog } = await openGroups(user);
    expect(
      await dialog.findByText(
        'Last quick add 3h ago stopped: The run stopped before it finished. Start it again: it continues with what is left.',
      ),
    ).toBeInTheDocument();
  });
});

describe('what the server refuses', () => {
  it('shows the run that is already going when another one was started in the meantime', async () => {
    const user = userEvent.setup();
    let started = false;
    const going = run({ id: 4, status: 'running', total: 4, processed: 1, created: 1 });
    mockServer.use(
      http.get('*/admin/suppliers/:id/service-groups', () =>
        HttpResponse.json(listing([group('imei', 'Apple', 4)], started ? going : null)),
      ),
      http.post('*/admin/suppliers/:id/quick-add', () => {
        started = true;
        return problem(
          409,
          'JOB_ALREADY_RUNNING',
          'Already running',
          'A quick add for this supplier is already running.',
        );
      }),
      http.get('*/admin/suppliers/:id/quick-add/:runId', () => HttpResponse.json(going)),
    );
    const { dialog } = await openGroups(user);
    await tick(user, dialog, 'Select Apple (IMEI)');
    await press(user, dialog, 'Review');
    await press(user, dialog, 'Add 4 services');

    expect(await dialog.findByRole('meter', { name: 'Quick add progress' })).toBeInTheDocument();
    expect(dialog.getByText('1 of 4 services, 1 added')).toBeInTheDocument();
    expect(dialog.queryByText('A quick add for this supplier is already running.')).not.toBeInTheDocument();
  });

  it('says nothing is left to add when the groups were emptied meanwhile, and shows the groups as they are now', async () => {
    const user = userEvent.setup();
    const { dialog } = await openGroups(user);
    await tick(user, dialog, 'Select USA (IMEI)');
    await press(user, dialog, 'Review');
    // Someone else adds the same group and the run ends before this one is sent.
    const other = await startQuickAdd(1, { scope: 'groups', groups: [{ type: 'imei', remoteGroup: 'USA' }] });
    await getQuickAddRun(1, other.id);
    await getQuickAddRun(1, other.id);
    await press(user, dialog, 'Add 1 service');

    expect(
      await dialog.findByText(/^Nothing to add: every service in this scope is already in the console/),
    ).toBeInTheDocument();
    const table = within(await dialog.findByRole('table', { name: 'Supplier groups' }));
    await waitFor(() => expect(table.getByRole('checkbox', { name: 'Select USA (IMEI)' })).toBeDisabled());
    expect(dialog.getByText('0 groups picked, 0 services to add')).toBeInTheDocument();
  });

  it('keeps the review open and shows the server’s own words for any other refusal', async () => {
    const user = userEvent.setup();
    mockServer.use(
      http.post('*/admin/suppliers/:id/quick-add', () =>
        problem(409, 'SUPPLIER_DISABLED', 'Supplier disabled', 'Nordic GSM is disabled. Enable it first.'),
      ),
    );
    const { dialog } = await openGroups(user);
    await tick(user, dialog, 'Select USA (IMEI)');
    await press(user, dialog, 'Review');
    await press(user, dialog, 'Add 1 service');
    expect(await dialog.findByText('Nordic GSM is disabled. Enable it first.')).toBeInTheDocument();
    expect(dialog.getByRole('button', { name: 'Add 1 service' })).toBeEnabled();
  });
});

describe('the other states of the first step', () => {
  it('says to sync a supplier whose service list is empty', async () => {
    const user = userEvent.setup();
    stubGroups([]);
    const { dialog } = await openQuickAdd(user);
    expect(await dialog.findByText('No services yet')).toBeInTheDocument();
    expect(dialog.getByText('Sync the supplier to copy its service list.')).toBeInTheDocument();
    expect(dialog.getByRole('button', { name: 'Review' })).toBeDisabled();
  });

  it('says there is nothing to add when every service is in the console already', async () => {
    const user = userEvent.setup();
    stubGroups([group('imei', 'Apple', 0, 6)]);
    const { dialog } = await openQuickAdd(user);
    expect(await dialog.findByText('Nothing to add')).toBeInTheDocument();
    expect(
      dialog.getByText('Everything this supplier lists is already in the console, or cannot be added.'),
    ).toBeInTheDocument();
  });

  it('shows the failure to load the groups, and Retry reads them again', async () => {
    const user = userEvent.setup();
    let fail = true;
    mockServer.use(
      http.get('*/admin/suppliers/:id/service-groups', () =>
        fail
          ? problem(404, 'NOT_FOUND', 'Not found', 'No supplier.')
          : HttpResponse.json(listing([group('imei', 'Apple', 2)])),
      ),
    );
    const { dialog } = await openQuickAdd(user);
    expect(await dialog.findByText("Could not load the supplier's groups")).toBeInTheDocument();
    fail = false;
    await press(user, dialog, 'Retry');
    expect(await dialog.findByRole('table', { name: 'Supplier groups' })).toBeInTheDocument();
  });
});
