// Tests for the Add-from-supplier form, single-services path, run on its own through a test host against the feature's mock API: the Quick Search
// box and the table of the page's kind, the ticks that stay, the server's preview, the group and status that are sent, the shop preview of each
// batch, a long list that goes 500 at a time, a run that stops and goes on, and the server's words under the field they are about.
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { invalid } from '@/mocks/handlers/accessShared';
import { mockServer } from '@/mocks/node';
import { problem } from '@/mocks/problem';
import { setupMockApi } from '@/test/renderApp';
import { mocks } from '../../mocks';
import {
  addButton,
  cellsOf,
  chooseSupplier,
  chooseWay,
  openForm,
  type User,
} from '../../test/addFromSupplier';
import { addNotImported, addOffered } from '../../test/bigCatalogue';
import { recordRequests } from '../../test/requests';

setupMockApi();
vi.setConfig({ testTimeout: 30_000 });
beforeEach(() => mockServer.use(...mocks.handlers));
afterEach(() => vi.restoreAllMocks());

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

/** Opens the form on the single-services path for a supplier (Nordic GSM unless said) and waits for the first rows of its table. */
async function openServices(
  user: User,
  options: { supplier?: string; type?: 'imei' | 'server'; permissions?: string[] } = {},
) {
  await openForm({ type: options.type, permissions: options.permissions });
  await chooseSupplier(user, options.supplier ?? 'Nordic GSM');
  await chooseWay(user, 'services');
  return within(await screen.findByRole('table', { name: 'Supplier services' }, { timeout: 10_000 }));
}

/** Ticks the box of the row that holds `name`. */
const tick = (user: User, table: ReturnType<typeof within>, name: string) =>
  user.click(within(table.getByText(name).closest('tr') as HTMLElement).getByRole('checkbox'));

/** The requests of one route, as the client sent them. */
const importPosts = (requests: ReturnType<typeof recordRequests>, suffix: '/import' | '/import/preview') =>
  requests.sent().filter((request) => request.method === 'POST' && request.url.pathname.endsWith(suffix));

const idsOf = (request: { body: unknown }) =>
  (request.body as { supplierServiceIds: number[] }).supplierServiceIds;

/** Whether `later` comes after `earlier` in the page. */
const comesAfter = (earlier: Node, later: Node) =>
  Boolean(earlier.compareDocumentPosition(later) & Node.DOCUMENT_POSITION_FOLLOWING);

describe('the picker', () => {
  it('lists the supplier’s services of the page’s kind under a Quick Search box, with a pager', async () => {
    const user = userEvent.setup();
    const table = await openServices(user);
    const box = within(screen.getByRole('group', { name: 'Quick Search' }));
    expect(box.getByRole('combobox', { name: 'Group' })).toBeInTheDocument();
    expect(box.getByRole('searchbox', { name: 'Search service from any group' })).toBeInTheDocument();
    expect(box.getByRole('button', { name: 'Search' })).toBeInTheDocument();
    expect(box.getByRole('checkbox', { name: 'Only services not imported yet' })).toBeInTheDocument();
    expect(table.getByText('Sprint USA Premium Unlock')).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Pagination' })).toHaveTextContent(
      /Results: 1 - \d+ of \d+/,
    );
  });

  it('shows only the Server services of a supplier on the Server page, and says when it has none', async () => {
    const user = userEvent.setup();
    const table = await openServices(user, { type: 'server', supplier: 'Gulf Server Hub' });
    expect(await table.findByText('Octoplus Credits x25')).toBeInTheDocument();
    expect(table.queryByText('Sprint USA Premium Unlock')).not.toBeInTheDocument();
    await chooseSupplier(user, 'Nordic GSM');
    expect(await screen.findByText('No Server services')).toBeInTheDocument();
    expect(screen.queryByRole('table', { name: 'Supplier services' })).not.toBeInTheDocument();
  });

  it('searches when Search is pressed, not at every key', async () => {
    const requests = recordRequests();
    const user = userEvent.setup();
    const table = await openServices(user);
    const found = () => requests.sent().some((request) => request.url.searchParams.get('q') === 'Telstra');
    await user.type(screen.getByRole('searchbox', { name: 'Search service from any group' }), 'Telstra');
    expect(found()).toBe(false);
    // The top bar has a Search button too (on a phone), so the one in the Quick Search box is asked for.
    await user.click(
      within(screen.getByRole('group', { name: 'Quick Search' })).getByRole('button', { name: 'Search' }),
    );
    await waitFor(() => expect(found()).toBe(true));
    expect(await table.findByText('Telstra Australia Unlock')).toBeInTheDocument();
    await waitFor(() => expect(table.queryByText('Sprint USA Premium Unlock')).not.toBeInTheDocument());
  });

  it('searches on Enter without adding anything', async () => {
    const user = userEvent.setup();
    const table = await openServices(user);
    await user.type(
      screen.getByRole('searchbox', { name: 'Search service from any group' }),
      'Telstra{Enter}',
    );
    expect(await table.findByText('Telstra Australia Unlock')).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Result' })).not.toBeInTheDocument();
  });

  it('narrows the list to a group of the page’s kind, asking for the group and the type', async () => {
    const requests = recordRequests();
    const user = userEvent.setup();
    const table = await openServices(user);
    const menu = screen.getByRole('combobox', { name: 'Group' });
    await within(menu).findByRole('option', { name: 'USA' });
    await user.selectOptions(menu, 'USA');
    await waitFor(() =>
      expect(
        requests
          .sent()
          .some(
            (request) =>
              request.url.searchParams.get('remoteGroup') === 'USA' &&
              request.url.searchParams.get('type') === 'imei',
          ),
      ).toBe(true),
    );
    expect(await table.findByText('Sprint USA Premium Unlock')).toBeInTheDocument();
    await waitFor(() => expect(table.queryByText('Telstra Australia Unlock')).not.toBeInTheDocument());
  });

  it('leaves out the services already in the console when asked', async () => {
    const user = userEvent.setup();
    const table = await openServices(user);
    expect(table.getByText('T-Mobile USA Unlock')).toBeInTheDocument();
    await user.click(screen.getByRole('checkbox', { name: 'Only services not imported yet' }));
    await waitFor(() => expect(table.queryByText('T-Mobile USA Unlock')).not.toBeInTheDocument());
    expect(table.getByText('Sprint USA Premium Unlock')).toBeInTheDocument();
  });

  it('draws Check All and With selected directly under the table, and the pager after them', async () => {
    const user = userEvent.setup();
    await openServices(user);
    const table = screen.getByRole('table', { name: 'Supplier services' });
    const checkAll = screen.getByRole('button', { name: 'Check All' });
    const preview = screen.getByRole('button', { name: 'Preview' });
    const pager = screen.getByRole('navigation', { name: 'Pagination' });
    expect(comesAfter(table, checkAll)).toBe(true);
    expect(comesAfter(checkAll, preview)).toBe(true);
    expect(comesAfter(preview, pager)).toBe(true);
  });

  it('keeps the picks when the search changes, and counts them in the bar', async () => {
    const user = userEvent.setup();
    const table = await openServices(user);
    await tick(user, table, 'Sprint USA Premium Unlock');
    await user.type(
      screen.getByRole('searchbox', { name: 'Search service from any group' }),
      'Telstra{Enter}',
    );
    await table.findByText('Telstra Australia Unlock');
    await tick(user, table, 'Telstra Australia Unlock');
    expect(await screen.findByText('2 picked')).toBeInTheDocument();
  });

  it('forgets the picks and the search when another supplier is chosen', async () => {
    const user = userEvent.setup();
    const table = await openServices(user);
    await tick(user, table, 'Sprint USA Premium Unlock');
    await chooseSupplier(user, 'Rapid IMEI');
    await screen.findByRole('table', { name: 'Supplier services' });
    expect(screen.queryByText('1 picked')).not.toBeInTheDocument();
    expect(addButton()).toHaveAttribute('title', 'Pick at least one service.');
  });
});

describe('the preview', () => {
  it('shows what the server says for each pick, and asks with no key for the defaults', async () => {
    const requests = recordRequests();
    const user = userEvent.setup();
    const table = await openServices(user);
    await tick(user, table, 'Sprint USA Premium Unlock');
    await tick(user, table, 'Telstra Australia Unlock');
    await user.click(screen.getByRole('button', { name: 'Preview' }));
    const preview = within(await screen.findByRole('table', { name: 'Import preview' }));
    expect(screen.getByText('2 new.')).toBeInTheDocument();
    expect(cellsOf(preview, 'Sprint USA Premium Unlock').slice(1, 4)).toEqual([
      'New',
      "Named after the supplier's group",
      '1–50',
    ]);
    const [sent] = importPosts(requests, '/import/preview');
    expect(sent.body).toEqual({ supplierServiceIds: [expect.any(Number), expect.any(Number)] });
  });

  it('is only for the picks it was made for: another tick takes it away', async () => {
    const user = userEvent.setup();
    const table = await openServices(user);
    await tick(user, table, 'Sprint USA Premium Unlock');
    await user.click(screen.getByRole('button', { name: 'Preview' }));
    await screen.findByRole('table', { name: 'Import preview' });
    await tick(user, table, 'Telstra Australia Unlock');
    expect(screen.queryByRole('table', { name: 'Import preview' })).not.toBeInTheDocument();
    expect(
      screen.getByText('Press Preview to see what adding the picked services does before you add them.'),
    ).toBeInTheDocument();
  });

  it('says there is nothing to add when every pick is in the console already, and keeps Add locked', async () => {
    const user = userEvent.setup();
    const table = await openServices(user);
    await tick(user, table, 'T-Mobile USA Unlock');
    await user.click(screen.getByRole('button', { name: 'Preview' }));
    expect(await screen.findByText('1 already match.')).toBeInTheDocument();
    expect(addButton()).toBeDisabled();
    expect(addButton()).toHaveAttribute('title', 'Everything picked is in the console already.');
  });

  it('lists the groups of the page’s kind in Service Listed In Group and sends the one chosen, which the preview names', async () => {
    const requests = recordRequests();
    const user = userEvent.setup();
    const table = await openServices(user);
    const menu = screen.getByRole('combobox', { name: 'Service Listed In Group' });
    const group = await within(menu).findByRole('option', { name: 'Carrier unlock' });
    expect(within(menu).getAllByRole('option')[0]).toHaveTextContent('Same as at the supplier');
    expect(within(menu).queryByRole('option', { name: 'Credits' })).not.toBeInTheDocument();
    await user.selectOptions(menu, 'Carrier unlock');
    await tick(user, table, 'Sprint USA Premium Unlock');
    await user.click(screen.getByRole('button', { name: 'Preview' }));
    const preview = within(await screen.findByRole('table', { name: 'Import preview' }));
    expect(cellsOf(preview, 'Sprint USA Premium Unlock')[2]).toBe('Carrier unlock');
    const [sent] = importPosts(requests, '/import/preview');
    expect(sent.body).toEqual({
      supplierServiceIds: [expect.any(Number)],
      categoryId: Number(group.getAttribute('value')),
    });
    expect(screen.getByRole('link', { name: 'Add New Group' })).toHaveAttribute(
      'href',
      '/products?view=add-group&type=imei',
    );
  });

  it('puts the server’s words about the group under its row', async () => {
    mockServer.use(
      http.post('*/admin/suppliers/:id/import/preview', () =>
        invalid([
          {
            field: 'categoryId',
            message: 'The group Apple is for server services. These do not fit: Sprint USA Premium Unlock.',
          },
        ]),
      ),
    );
    const user = userEvent.setup();
    const table = await openServices(user);
    await tick(user, table, 'Sprint USA Premium Unlock');
    await user.click(screen.getByRole('button', { name: 'Preview' }));
    expect(
      await screen.findByText(
        'The group Apple is for server services. These do not fit: Sprint USA Premium Unlock.',
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Service Listed In Group' })).toHaveAttribute(
      'aria-invalid',
      'true',
    );
    expect(
      screen.getByText('Some fields need attention. Change what it names and try again.'),
    ).toBeInTheDocument();
  });

  it('locks the group menu for a role that cannot read the groups, with the reason', async () => {
    const user = userEvent.setup();
    await openServices(user, { permissions: ['suppliers:read', 'catalog:create'] });
    const menu = screen.getByRole('combobox', { name: 'Service Listed In Group' });
    expect(menu).toBeDisabled();
    expect(menu).toHaveAttribute('title', 'You need the catalog:read permission');
  });
});

describe('Add', () => {
  it('adds the picks with the status chosen, shows the result in place and tells the host the ids', async () => {
    stubRules(0);
    const requests = recordRequests();
    const user = userEvent.setup();
    const table = await openServices(user);
    await tick(user, table, 'Sprint USA Premium Unlock');
    await tick(user, table, 'Telstra Australia Unlock');
    await user.click(screen.getByRole('switch', { name: 'Status' }));
    await user.click(addButton());
    const result = within(await screen.findByRole('region', { name: 'Result' }));
    expect(await result.findByText('2 services added')).toBeInTheDocument();
    const [sent] = importPosts(requests, '/import');
    expect(sent.body).toEqual({
      supplierServiceIds: [expect.any(Number), expect.any(Number)],
      status: 'disabled',
    });
    await waitFor(() =>
      expect(screen.getByTestId('told')).toHaveTextContent(/^Told 1 time\(s\): \[\d+,\d+\]$/),
    );
    // What was added leaves the picks, so a second press cannot send it again.
    expect(addButton()).toHaveAttribute('title', 'Pick at least one service.');
    expect(result.getByRole('link', { name: 'See them in All' })).toHaveAttribute(
      'href',
      '/products?view=all&type=imei',
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('sends only the new and changed services of a current preview', async () => {
    stubRules(0);
    const requests = recordRequests();
    const user = userEvent.setup();
    const table = await openServices(user);
    await tick(user, table, 'Sprint USA Premium Unlock');
    await tick(user, table, 'T-Mobile USA Unlock');
    await user.click(screen.getByRole('button', { name: 'Preview' }));
    expect(await screen.findByText('1 new, 1 already match.')).toBeInTheDocument();
    await user.click(addButton());
    expect(await screen.findByText('1 service added')).toBeInTheDocument();
    expect(
      importPosts(requests, '/import')
        .map(idsOf)
        .map((ids) => ids.length),
    ).toEqual([1]);
  });

  it('locks the shop choice for Inactive services, with the reason', async () => {
    stubRules(1);
    const user = userEvent.setup();
    await openServices(user);
    await user.click(screen.getByRole('switch', { name: 'Status' }));
    const shop = screen.getByRole('switch', { name: 'Put on the shop' });
    expect(shop).toBeDisabled();
    expect(shop).toHaveAttribute('title', 'Services added switched off cannot go on the shop.');
  });

  it('asks for a shop preview of each batch when the choice is Yes, and links to it', async () => {
    stubRules(1);
    const sent: { body?: unknown } = {};
    mockServer.use(
      http.post('*/admin/publish-runs', async ({ request }) => {
        sent.body = await request.json();
        return HttpResponse.json({ id: 77 }, { status: 201 });
      }),
    );
    const user = userEvent.setup();
    const table = await openServices(user);
    await waitFor(() =>
      expect(screen.getByRole('switch', { name: 'Put on the shop' })).toHaveAttribute('aria-checked', 'true'),
    );
    await tick(user, table, 'Sprint USA Premium Unlock');
    await tick(user, table, 'Telstra Australia Unlock');
    await user.click(addButton());
    expect(await screen.findByText('A shop preview is ready for 2 services.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Review and publish' })).toHaveAttribute(
      'href',
      '/products?view=publish&run=77',
    );
    expect(sent.body).toEqual({
      scope: { kind: 'services', serviceIds: [expect.any(Number), expect.any(Number)] },
    });
    expect(screen.getByText(/Nothing is on the shop yet/)).toBeInTheDocument();
  });

  it('keeps the import when its shop preview is refused, and asks again on Try again', async () => {
    stubRules(1);
    let calls = 0;
    mockServer.use(
      http.post('*/admin/publish-runs', () => {
        calls += 1;
        return calls === 1
          ? problem(422, 'VALIDATION_FAILED', 'Check the form', 'No service of the scope can be published.')
          : HttpResponse.json({ id: 78 }, { status: 201 });
      }),
    );
    const user = userEvent.setup();
    const table = await openServices(user);
    await waitFor(() =>
      expect(screen.getByRole('switch', { name: 'Put on the shop' })).toHaveAttribute('aria-checked', 'true'),
    );
    await tick(user, table, 'Sprint USA Premium Unlock');
    await tick(user, table, 'Telstra Australia Unlock');
    await user.click(addButton());
    expect(await screen.findByText('2 services added')).toBeInTheDocument();
    expect(
      await screen.findByText(
        'The shop preview for 2 services could not be started. No service of the scope can be published.',
      ),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByText('A shop preview is ready for 2 services.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Review and publish' })).toHaveAttribute(
      'href',
      '/products?view=publish&run=78',
    );
  });

  it('is locked for a role without catalog:create', async () => {
    const user = userEvent.setup();
    const table = await openServices(user, { permissions: ['suppliers:read', 'catalog:read'] });
    await tick(user, table, 'Sprint USA Premium Unlock');
    expect(addButton()).toBeDisabled();
    expect(addButton()).toHaveAttribute('title', 'You need the catalog:create permission');
  });
});

describe('a long list', () => {
  it('picks every service not in the console yet on every page and adds them 500 at a time', async () => {
    stubRules(0);
    await addNotImported(1, 600);
    const requests = recordRequests();
    const user = userEvent.setup();
    await openServices(user);
    expect(
      await screen.findByText(
        /Check All ticks the 603 services not in the console yet for this search and group/,
      ),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Check All' }));
    expect(await screen.findByText('603 picked')).toBeInTheDocument();
    expect(screen.getByText(/More than 500 picked/)).toBeInTheDocument();
    await user.click(addButton());
    expect(await screen.findByText('603 services added')).toBeInTheDocument();
    expect(
      importPosts(requests, '/import')
        .map(idsOf)
        .map((ids) => ids.length),
    ).toEqual([500, 103]);
  });

  it('stops with the server’s words after a batch fails, keeps what was added, fixes the choices and goes on from there', async () => {
    stubRules(0);
    await addNotImported(1, 600);
    let calls = 0;
    const sent: number[][] = [];
    mockServer.use(
      http.post('*/admin/suppliers/:id/import', async ({ request }) => {
        calls += 1;
        const ids = ((await request.json()) as { supplierServiceIds: number[] }).supplierServiceIds;
        sent.push(ids);
        if (calls === 2)
          return problem(503, 'UPSTREAM_ERROR', 'Busy', 'The server is busy. Try again in a moment.');
        return HttpResponse.json({ created: ids.length, updated: 0, unchanged: 0, createdServiceIds: ids });
      }),
    );
    const user = userEvent.setup();
    await openServices(user);
    await screen.findByText(/Check All ticks the 603 services/);
    await user.click(screen.getByRole('button', { name: 'Check All' }));
    await screen.findByText('603 picked');
    await user.click(addButton());
    expect(
      await screen.findByText(
        '500 of 603 services were added before it stopped. The server is busy. Try again in a moment.',
      ),
    ).toBeInTheDocument();
    expect(screen.getByText('500 services added')).toBeInTheDocument();
    expect(addButton()).toHaveTextContent('Continue adding (103 left)');
    expect(screen.getByRole('switch', { name: 'Status' })).toBeDisabled();
    await user.click(addButton());
    expect(await screen.findByText('603 services added')).toBeInTheDocument();
    expect(sent.map((ids) => ids.length)).toEqual([500, 103, 103]);
    // The host is told for what the first answer added, and again for the rest.
    await waitFor(() => expect(screen.getByTestId('told')).toHaveTextContent(/^Told 2 time\(s\):/));
  });
});

describe('a supplier that spells the kind two ways', () => {
  it('counts, ticks and adds only the services of the page’s kind with Check All', async () => {
    stubRules(0);
    // The IMEI groups are spelled `imei` and `IMEI`, so the server cannot narrow the list to the kind: Check All reads every kind.
    const ids = await addOffered(1, [
      { name: 'Mixed IMEI One', group: 'Mixed IMEI', type: 'IMEI' },
      { name: 'Mixed IMEI Two', group: 'Mixed IMEI', type: 'IMEI' },
      { name: 'Mixed Server One', group: 'Mixed Server', type: 'server' },
      { name: 'Mixed Remote One', group: 'Mixed Remote', type: 'remote' },
      { name: 'Mixed File One', group: 'Mixed File', type: 'file' },
    ]);
    const ofOtherKinds = ids.slice(2);
    const requests = recordRequests();
    const user = userEvent.setup();
    await openServices(user);
    // The three IMEI services of the seed and the two above; the three other kinds are not counted.
    expect(
      await screen.findByText(
        /Check All ticks the 5 services not in the console yet for this search and group/,
      ),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Check All' }));
    expect(await screen.findByText('5 picked')).toBeInTheDocument();
    await user.click(addButton());
    expect(await screen.findByText('5 services added')).toBeInTheDocument();
    const sent = importPosts(requests, '/import').flatMap(idsOf);
    expect(sent).toHaveLength(5);
    for (const id of ofOtherKinds) expect(sent).not.toContain(id);
  });
});

describe('the view frame', () => {
  it('draws the host’s header inside the form, above the rows, and the result above the pinned bar', async () => {
    stubRules(0);
    const user = userEvent.setup();
    await openForm({ header: <h2>Probe heading</h2> });
    await chooseSupplier(user, 'Nordic GSM');
    await chooseWay(user, 'services');
    const table = within(
      await screen.findByRole('table', { name: 'Supplier services' }, { timeout: 10_000 }),
    );
    const heading = screen.getByRole('heading', { name: 'Probe heading' });
    expect(heading.closest('form')).toBe(addButton().closest('form'));
    expect(comesAfter(heading, screen.getByRole('combobox', { name: 'Supplier' }))).toBe(true);
    await tick(user, table, 'Sprint USA Premium Unlock');
    await user.click(addButton());
    const result = await screen.findByRole('region', { name: 'Result' });
    expect(result.closest('form')).toBe(addButton().closest('form'));
    expect(comesAfter(result, addButton())).toBe(true);
  });
});

describe('the group menu', () => {
  it('reads up to 1000 groups, so a group past the two-hundredth (a new one goes last) is offered too', async () => {
    const user = userEvent.setup();
    const requests = recordRequests();
    await openServices(user);
    await waitFor(() =>
      expect(
        requests.sent().some((request) => request.url.pathname.endsWith('/admin/service-categories')),
      ).toBe(true),
    );
    const read = requests
      .sent()
      .find((request) => request.url.pathname.endsWith('/admin/service-categories'));
    expect(read?.url.searchParams.get('_start')).toBe('0');
    expect(read?.url.searchParams.get('_end')).toBe('1000');
  });
});
