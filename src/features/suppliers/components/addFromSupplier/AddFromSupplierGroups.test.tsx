// Tests for the Add-from-supplier form, whole-groups path, run on its own through a test host against the feature's mock API: the Supplier row and
// its notes, the groups of the page's kind, what each choice sends, the shop choice and its locks, the confirm box of a big run, the run shown in
// place, a refused start and a run that is going already. Where a test needs a group list or a run the seed does not hold, it answers the route.
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mockServer } from '@/mocks/node';
import { invalid } from '@/mocks/handlers/accessShared';
import { problem } from '@/mocks/problem';
import { setupMockApi } from '@/test/renderApp';
import { mocks, suppliersState } from '../../mocks';
import { addButton, cellsOf, chooseSupplier, openForm } from '../../test/addFromSupplier';
import type { QuickAddRun, ServiceGroup } from '../../types';

setupMockApi();
vi.setConfig({ testTimeout: 30_000 });
beforeEach(() => mockServer.use(...mocks.handlers));

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
  publish: 'none',
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
function listing(groups: ServiceGroup[], latestRun: QuickAddRun | null) {
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

/** Answers the list of active shop price rules with `count` rows: none locks the shop choice, one or more leave it open. */
const stubRules = (count: number) =>
  mockServer.use(
    http.get('*/admin/retail-price-rules', () =>
      HttpResponse.json(
        Array.from({ length: count }, (_, index) => ({ id: index + 1 })),
        { headers: { 'x-total-count': String(count) } },
      ),
    ),
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

/** Opens the form, chooses Nordic GSM and waits for its groups table. */
async function openGroups(user: ReturnType<typeof userEvent.setup>, type?: 'imei' | 'server') {
  await openForm({ type });
  await chooseSupplier(user, type === 'server' ? 'Gulf Server Hub' : 'Nordic GSM');
  return within(await screen.findByRole('table', { name: 'Supplier groups' }));
}

describe('the Supplier row', () => {
  it('asks for a supplier first and keeps Add locked with the reason', async () => {
    await openForm();
    const menu = screen.getByRole('combobox', { name: 'Supplier' });
    expect(await within(menu).findByRole('option', { name: 'Nordic GSM' })).toBeInTheDocument();
    expect(within(menu).getAllByRole('option')[0]).toHaveTextContent('- Select -');
    expect(screen.getByRole('switch', { name: 'Add' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByText('Pick a supplier to see the groups it offers.')).toBeInTheDocument();
    expect(addButton()).toBeDisabled();
    expect(addButton()).toHaveAttribute('title', 'Pick a supplier first.');
  });

  it('lists a switched off supplier but does not let it be chosen, and says why', async () => {
    const state = await suppliersState();
    const off = state.suppliers.list().find((supplier) => supplier.name === 'Bosphorus Unlock');
    state.suppliers.patch(off?.id as number, { status: 'disabled' });
    await openForm({ initial: { supplierId: off?.id } });
    const option = await screen.findByRole('option', { name: 'Bosphorus Unlock (switched off)' });
    expect(option).toBeDisabled();
    expect(screen.getByText(/A supplier that is switched off cannot be chosen/)).toBeInTheDocument();
    expect(
      await screen.findByText(/Bosphorus Unlock is switched off, so its services cannot be added/),
    ).toBeInTheDocument();
    expect(addButton()).toHaveAttribute('title', 'Pick a supplier first.');
  });

  it('says so when the address names a supplier that is not among the connected ones', async () => {
    await openForm({ initial: { supplierId: 9_999 } });
    expect(
      await screen.findByText('That supplier is not among your connected suppliers. Pick one below.'),
    ).toBeInTheDocument();
  });

  it('starts on the supplier the address names', async () => {
    stubGroups([group('imei', 'Apple', 3)]);
    await openForm({ initial: { supplierId: 1 } });
    expect(await screen.findByRole('table', { name: 'Supplier groups' })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Supplier' })).toHaveValue('1');
  });
});

describe('the groups', () => {
  it('lists the groups of the page’s kind with what each can add, and disables one with nothing to add', async () => {
    stubGroups([
      group('imei', 'Apple', 12, 3),
      group('imei', 'Samsung', 0, 5),
      group('server', 'Credits', 4),
    ]);
    const user = userEvent.setup();
    const table = await openGroups(user);
    expect(cellsOf(table, 'Apple')).toEqual(['', 'Apple', '12', '3', '–']);
    expect(table.getByRole('checkbox', { name: 'Select Samsung' })).toBeDisabled();
    expect(table.queryByText('Credits')).not.toBeInTheDocument();
    expect(screen.getByText('0 groups picked, 0 services to add')).toBeInTheDocument();
  });

  it('shows the Server groups on the Server page and none of the IMEI ones', async () => {
    stubGroups([group('imei', 'Apple', 12), group('server', 'Credits', 4)]);
    const user = userEvent.setup();
    const table = await openGroups(user, 'server');
    expect(table.getByText('Credits')).toBeInTheDocument();
    expect(table.queryByText('Apple')).not.toBeInTheDocument();
  });

  it('says a supplier has nothing of the kind when none of its groups is', async () => {
    const user = userEvent.setup();
    await openForm({ type: 'server' });
    await chooseSupplier(user, 'Nordic GSM');
    expect(await screen.findByText('No Server services')).toBeInTheDocument();
    expect(screen.queryByRole('table', { name: 'Supplier groups' })).not.toBeInTheDocument();
  });

  it('says there is nothing to add when every group of the kind is in the console already', async () => {
    stubGroups([group('imei', 'Apple', 0, 6)]);
    const user = userEvent.setup();
    await openForm();
    await chooseSupplier(user, 'Nordic GSM');
    expect(await screen.findByText('Nothing to add')).toBeInTheDocument();
  });

  it('counts what the picks add up to and can pick and clear every group', async () => {
    stubGroups([group('imei', 'Apple', 12), group('imei', 'Samsung', 5), group('imei', 'Xiaomi', 0, 2)]);
    const user = userEvent.setup();
    const table = await openGroups(user);
    await user.click(table.getByRole('checkbox', { name: 'Select Apple' }));
    expect(screen.getByText('1 group picked, 12 services to add')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Check All' }));
    expect(screen.getByText('2 groups picked, 17 services to add')).toBeInTheDocument();
    expect(table.getByRole('checkbox', { name: 'Select Xiaomi' })).not.toBeChecked();
    await user.click(screen.getByRole('button', { name: 'Uncheck All' }));
    expect(screen.getByText('0 groups picked, 0 services to add')).toBeInTheDocument();
  });

  it('narrows the table by the search without losing the picks', async () => {
    stubGroups([group('imei', 'Apple', 12), group('imei', 'Samsung', 5)]);
    const user = userEvent.setup();
    const table = await openGroups(user);
    await user.click(table.getByRole('checkbox', { name: 'Select Apple' }));
    await user.type(screen.getByRole('searchbox', { name: 'Search groups' }), 'sams');
    expect(table.queryByText('Apple')).not.toBeInTheDocument();
    expect(screen.getByText('1 group picked, 12 services to add')).toBeInTheDocument();
  });

  it('forgets the picks when another supplier is chosen', async () => {
    stubGroups([group('imei', 'Apple', 12)]);
    const user = userEvent.setup();
    const table = await openGroups(user);
    await user.click(table.getByRole('checkbox', { name: 'Select Apple' }));
    await chooseSupplier(user, 'Rapid IMEI');
    expect(await screen.findByText('0 groups picked, 0 services to add')).toBeInTheDocument();
    expect(addButton()).toHaveAttribute('title', 'Pick at least one group.');
  });
});

describe('what Add sends', () => {
  it('starts a run for the picked groups only, never for the whole supplier while a group of another kind could be left out', async () => {
    stubRules(0);
    stubGroups([group('imei', 'Apple', 12), group('server', 'Credits', 4)]);
    const sent: { body?: unknown } = {};
    stubRun(sent, run({ total: 12 }), run({ status: 'succeeded', total: 12, processed: 12, created: 12 }));
    const user = userEvent.setup();
    const table = await openGroups(user);
    await user.click(table.getByRole('checkbox', { name: 'Select Apple' }));
    await user.click(addButton());
    await waitFor(() =>
      expect(sent.body).toEqual({ scope: 'groups', groups: [{ type: 'imei', remoteGroup: 'Apple' }] }),
    );
  });

  it('sends the scope all when the supplier has nothing else to add', async () => {
    stubRules(0);
    stubGroups([group('imei', 'Apple', 12), group('imei', 'Samsung', 5)]);
    const sent: { body?: unknown } = {};
    stubRun(sent, run({ total: 17 }), run({ status: 'succeeded', total: 17, processed: 17, created: 17 }));
    const user = userEvent.setup();
    await openGroups(user);
    await user.click(screen.getByRole('button', { name: 'Check All' }));
    await user.click(addButton());
    await waitFor(() => expect(sent.body).toEqual({ scope: 'all' }));
  });

  it('sends the status of Inactive, and locks the shop choice with the reason', async () => {
    stubRules(1);
    stubGroups([group('imei', 'Apple', 12)]);
    const sent: { body?: unknown } = {};
    stubRun(sent, run({ total: 12 }), run({ status: 'succeeded', total: 12, processed: 12, created: 12 }));
    const user = userEvent.setup();
    const table = await openGroups(user);
    await user.click(screen.getByRole('switch', { name: 'Status' }));
    const shop = screen.getByRole('switch', { name: 'Put on the shop' });
    expect(shop).toBeDisabled();
    expect(shop).toHaveAttribute('title', 'Services added switched off cannot go on the shop.');
    await user.click(table.getByRole('checkbox', { name: 'Select Apple' }));
    await user.click(addButton());
    await waitFor(() => expect(sent.body).toEqual({ scope: 'all', serviceStatus: 'disabled' }));
  });

  it('puts what it adds on the shop when the rule is active and the choice is Yes (its default)', async () => {
    stubRules(1);
    stubGroups([group('imei', 'Apple', 12)]);
    const sent: { body?: unknown } = {};
    stubRun(sent, run({ total: 12 }), run({ status: 'succeeded', total: 12, processed: 12, created: 12 }));
    const user = userEvent.setup();
    const table = await openGroups(user);
    await waitFor(() =>
      expect(screen.getByRole('switch', { name: 'Put on the shop' })).toHaveAttribute('aria-checked', 'true'),
    );
    await user.click(table.getByRole('checkbox', { name: 'Select Apple' }));
    await user.click(addButton());
    await waitFor(() => expect(sent.body).toEqual({ scope: 'all', publish: { listed: true } }));
  });

  it('locks the shop choice with the reason and a link when no shop price rule is active', async () => {
    stubRules(0);
    stubGroups([group('imei', 'Apple', 12)]);
    const user = userEvent.setup();
    await openGroups(user);
    const shop = screen.getByRole('switch', { name: 'Put on the shop' });
    await waitFor(() => expect(shop).toBeDisabled());
    expect(shop).toHaveAttribute('aria-checked', 'false');
    expect(shop).toHaveAttribute(
      'title',
      'No shop price rule is active. Make one first, then put them on the shop.',
    );
    // The review list below the groups has the same link, so the one that sits with the reason is found through the reason.
    const reason = screen.getByText(
      'No shop price rule is active. Make one first, then put them on the shop.',
    );
    expect(within(reason).getByRole('link', { name: 'Open the shop price rules' })).toHaveAttribute(
      'href',
      '/products?view=rules&tab=shop',
    );
  });

  it('locks the shop choice for a role that may not publish', async () => {
    stubRules(1);
    stubGroups([group('imei', 'Apple', 12)]);
    const user = userEvent.setup();
    await openForm({
      permissions: ['suppliers:read', 'catalog:create', 'catalog:read', 'pricing:read', 'storefront:read'],
    });
    await chooseSupplier(user, 'Nordic GSM');
    const shop = await screen.findByRole('switch', { name: 'Put on the shop' });
    expect(shop).toBeDisabled();
    expect(shop).toHaveAttribute('title', 'You need the storefront:publish permission');
  });

  it('asks for a tick box above 500 services and does not start before it', async () => {
    stubRules(0);
    stubGroups([group('imei', 'Bulk', 600), group('imei', 'Other', 5)]);
    const sent: { body?: unknown } = {};
    stubRun(
      sent,
      run({ total: 600 }),
      run({ status: 'succeeded', total: 600, processed: 600, created: 600 }),
    );
    const user = userEvent.setup();
    const table = await openGroups(user);
    await user.click(table.getByRole('checkbox', { name: 'Select Bulk' }));
    const confirm = screen.getByRole('checkbox', { name: 'I checked the groups. Add 600 services.' });
    expect(addButton()).toBeDisabled();
    expect(addButton()).toHaveAttribute('title', 'Tick the box above to confirm.');
    await user.click(confirm);
    expect(addButton()).toBeEnabled();
    await user.click(addButton());
    await waitFor(() => expect(sent.body).toBeDefined());
  });

  it('is locked for a role without catalog:create', async () => {
    stubGroups([group('imei', 'Apple', 12)]);
    const user = userEvent.setup();
    await openForm({ permissions: ['suppliers:read', 'catalog:read'] });
    await chooseSupplier(user, 'Nordic GSM');
    await screen.findByRole('table', { name: 'Supplier groups' });
    expect(addButton()).toBeDisabled();
    expect(addButton()).toHaveAttribute('title', 'You need the catalog:create permission');
  });
});

describe('the run', () => {
  it('shows the progress and the result in place and tells the host once, with no ids', async () => {
    stubRules(0);
    stubGroups([group('imei', 'Apple', 12)]);
    const sent: { body?: unknown } = {};
    stubRun(sent, run({ total: 12 }), run({ status: 'succeeded', total: 12, processed: 12, created: 12 }));
    const user = userEvent.setup();
    const table = await openGroups(user);
    await user.click(table.getByRole('checkbox', { name: 'Select Apple' }));
    await user.click(addButton());
    const progress = within(await screen.findByRole('region', { name: 'Progress' }));
    expect(await progress.findByText('12 services added')).toBeInTheDocument();
    expect(progress.getByRole('link', { name: 'See them in All' })).toHaveAttribute(
      'href',
      '/products?view=all&type=imei',
    );
    await waitFor(() => expect(screen.getByTestId('told')).toHaveTextContent('Told 1 time(s): []'));
    // No dialog and no steps: the whole add happens in the form.
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('shows the server’s words for a refused start and keeps the picks', async () => {
    stubRules(0);
    stubGroups([group('imei', 'Apple', 12)]);
    mockServer.use(
      http.post('*/admin/suppliers/:id/quick-add', () =>
        invalid([
          {
            field: 'scope',
            message: 'Nothing to add: every service in this scope is in the console already.',
          },
        ]),
      ),
    );
    const user = userEvent.setup();
    const table = await openGroups(user);
    await user.click(table.getByRole('checkbox', { name: 'Select Apple' }));
    await user.click(addButton());
    expect(await screen.findByRole('alert')).toHaveTextContent('Nothing to add: every service in this scope');
    expect(table.getByRole('checkbox', { name: 'Select Apple' })).toBeChecked();
    expect(screen.getByTestId('told')).toHaveTextContent('Told nothing');
  });

  it('shows a run of the supplier that is going at once, and keeps Add locked until it ends', async () => {
    const going = run({ status: 'running', total: 10, processed: 3, created: 3 });
    stubGroups([group('imei', 'Apple', 12)], going);
    mockServer.use(http.get('*/admin/suppliers/:id/quick-add/:runId', () => HttpResponse.json(going)));
    const user = userEvent.setup();
    await openGroups(user);
    const progress = within(await screen.findByRole('region', { name: 'Progress' }));
    expect(await progress.findByText('3 of 10 services, 3 added')).toBeInTheDocument();
    expect(addButton()).toBeDisabled();
    expect(addButton()).toHaveAttribute('title', 'A quick add for this supplier is already running.');
  });

  it('shows the run that is going instead of a start the server refused because of it', async () => {
    stubRules(0);
    const going = run({ status: 'running', total: 10, processed: 4, created: 4 });
    // The first answer has no run; once the start was refused the supplier has one.
    let refused = false;
    mockServer.use(
      http.get('*/admin/suppliers/:id/service-groups', () =>
        HttpResponse.json(listing([group('imei', 'Apple', 12)], refused ? going : null)),
      ),
      http.post('*/admin/suppliers/:id/quick-add', () => {
        refused = true;
        return problem(
          409,
          'JOB_ALREADY_RUNNING',
          'A quick add is already running',
          'A quick add for this supplier is already running.',
        );
      }),
      http.get('*/admin/suppliers/:id/quick-add/:runId', () => HttpResponse.json(going)),
    );
    const user = userEvent.setup();
    const table = await openGroups(user);
    await user.click(table.getByRole('checkbox', { name: 'Select Apple' }));
    await user.click(addButton());
    expect(await screen.findByText('4 of 10 services, 4 added')).toBeInTheDocument();
    expect(addButton()).toHaveAttribute('title', 'A quick add for this supplier is already running.');
  });
});
