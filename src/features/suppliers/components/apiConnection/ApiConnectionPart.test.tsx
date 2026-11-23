// Tests for the API Connection part of a service's edit view, run inside the real app shell against the feature's mock API: it reads the chain
// of a service, shows its primary and secondary connections, edits them (also for a service with no connection yet), saves the whole chain,
// makes the services reads stale, and keeps each control's permission. The part is mounted in a small route of its own, the way a host does.
import { useOne } from '@refinedev/core';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http } from 'msw';
import { Route } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mockServer } from '@/mocks/node';
import { problem } from '@/mocks/problem';
import { SERVICE_ROWS_KEY, useApiQuery } from '@/lib/query';
import { mockMe, renderShell, setupMockApi, signInAs } from '@/test/renderApp';
import { replaceSupplierLinks } from '../../api';
import { mocks, suppliersState } from '../../mocks';
import type { EditLock } from '../../lib/links';
import { recordRequests } from '../../test/requests';
import { toasts } from '../../test/suppliersPage';
import { ApiConnectionPart } from './ApiConnectionPart';

/** How many times the services rows probe was read: a save must make it stale. */
let rowReads = 0;

setupMockApi();
vi.setConfig({ testTimeout: 30_000 });
beforeEach(() => {
  rowReads = 0;
  mockServer.use(...mocks.handlers);
});
afterEach(() => vi.restoreAllMocks());

// Service 1 of the mock seed: Rapid IMEI is its primary supplier and Nordic GSM its fallback (supplier ids 3 and 1; Gulf Server Hub is 2).
const SERVICE = 1;
const NAME = 'iCloud Clean / Lost Check';
const EDITABLE: EditLock = { disabled: false };
const NO_UPDATE: EditLock = { disabled: true, title: 'You need the catalog:update permission' };

/** Stands in for the services list and the detail: two reads that a save of the chain must make stale. */
function Probes() {
  useOne({ resource: 'services', id: SERVICE });
  useApiQuery({
    queryKey: [...SERVICE_ROWS_KEY, 'probe'],
    queryFn: async () => {
      rowReads += 1;
      return rowReads;
    },
  });
  return null;
}

type Options = {
  serviceId?: number;
  canEdit?: EditLock;
  permissions?: string[];
  probes?: boolean;
  /** Runs once the staff member is signed in, before the part is shown. */
  prepare?: () => Promise<void>;
};

/** Mounts the part for a service in a region of its own and returns that region, once the part (or its error) is on screen. */
async function show({ serviceId = SERVICE, canEdit = EDITABLE, permissions, probes, prepare }: Options = {}) {
  await signInAs();
  if (permissions) mockMe({ id: 1, name: 'Rami K.', permissions });
  await prepare?.();
  const onDirtyChange = vi.fn();
  const view = renderShell(
    '/probe',
    <Route
      path="/probe"
      element={
        <>
          {probes && <Probes />}
          <section aria-label="API Connection part">
            <ApiConnectionPart
              serviceId={serviceId}
              serviceName={NAME}
              canEdit={canEdit}
              onDirtyChange={onDirtyChange}
            />
          </section>
        </>
      }
    />,
  );
  const section = within(
    await screen.findByRole('region', { name: 'API Connection part' }, { timeout: 10_000 }),
  );
  return { section, onDirtyChange, view };
}

type Section = ReturnType<typeof within>;

const secondaryTable = (section: Section) =>
  section.findByRole('table', { name: 'Secondary API connections' });
const apiMenu = (section: Section) => section.getByRole('combobox', { name: 'API' });
const addMenu = (section: Section) => section.getByRole('combobox', { name: 'Add a secondary API' });
const saveButton = (section: Section) => section.getByRole('button', { name: 'Save' });
const suppliersOf = async (serviceId = SERVICE) => {
  const state = await suppliersState();
  return state.links
    .filter((link) => link.serviceId === serviceId)
    .map((link) => state.catalogue.find(link.supplierServiceId)?.supplierId);
};

describe('the chain of a service', () => {
  it('shows the primary connection and its service, then the secondary ones in a table, with nothing to save yet', async () => {
    const { section, onDirtyChange } = await show();
    const table = await secondaryTable(section);
    expect(apiMenu(section)).toHaveDisplayValue('Rapid IMEI');
    // The service of the primary connection and the service of the secondary one carry the same name in the mock seed.
    expect(section.getAllByText(NAME)).toHaveLength(2);
    expect(section.getByRole('button', { name: 'Change' })).toBeEnabled();
    const rows = within(table).getAllByRole('row');
    expect(rows).toHaveLength(2);
    expect(rows[1]).toHaveTextContent('FallbackNordic GSM' + NAME);
    expect(section.getByRole('heading', { level: 3, name: 'API Connection' })).toBeInTheDocument();
    expect(section.getByRole('heading', { level: 3, name: 'Secondary API Connections' })).toBeInTheDocument();
    expect(section.getByRole('button', { name: 'Move Nordic GSM down' })).toBeDisabled();
    expect(saveButton(section)).toBeDisabled();
    expect(onDirtyChange).not.toHaveBeenCalledWith(true);
  });

  it('reads the chain of the service it is given, from the address of that service', async () => {
    const requests = recordRequests();
    const { section } = await show();
    await secondaryTable(section);
    const reads = requests
      .sent()
      .filter(
        (sent) => sent.method === 'GET' && sent.url.pathname === `/admin/services/${SERVICE}/supplier-links`,
      );
    expect(reads.length).toBeGreaterThanOrEqual(1);
  });

  it('shows the words of the server when the chain cannot be read, and reads it again on Retry', async () => {
    const user = userEvent.setup();
    mockServer.use(
      http.get('*/admin/services/:id/supplier-links', () =>
        problem(404, 'NOT_FOUND', 'Not found', 'No such service.'),
      ),
    );
    const { section } = await show();
    expect(await section.findByText('Could not load the suppliers')).toBeInTheDocument();
    expect(section.getByText('No such service.')).toBeInTheDocument();
    mockServer.resetHandlers();
    mockServer.use(...mocks.handlers);
    await user.click(section.getByRole('button', { name: 'Retry' }));
    expect(await secondaryTable(section)).toBeInTheDocument();
  });
});

describe('editing and saving', () => {
  it('moves the first secondary connection into the primary place, tells the host it is unsaved, and saves the whole chain in the new order', async () => {
    const user = userEvent.setup();
    let sent: unknown;
    mockServer.use(
      // A clone, so the body is still there for the mock route this handler passes the request on to.
      http.put('*/admin/services/:id/supplier-links', async ({ request }) => {
        sent = await request.clone().json();
        return undefined;
      }),
    );
    const { section, onDirtyChange } = await show();
    await secondaryTable(section);
    await user.click(section.getByRole('button', { name: 'Move Nordic GSM up' }));
    expect(apiMenu(section)).toHaveDisplayValue('Nordic GSM');
    expect(within(await secondaryTable(section)).getAllByRole('row')[1]).toHaveTextContent(
      'FallbackRapid IMEI',
    );
    await waitFor(() => expect(onDirtyChange).toHaveBeenLastCalledWith(true));

    await user.click(saveButton(section));
    expect(await section.findByText('Saved')).toBeInTheDocument();
    expect(await toasts().findByText('Supplier links updated')).toBeInTheDocument();
    expect(sent).toMatchObject({ links: [{ priority: 1 }, { priority: 2 }] });
    expect(await suppliersOf()).toEqual([1, 3]);

    // The chain is read again: Nordic GSM stays the primary and there is nothing left to save.
    await waitFor(() => expect(onDirtyChange).toHaveBeenLastCalledWith(false));
    expect(apiMenu(section)).toHaveDisplayValue('Nordic GSM');
    expect(saveButton(section)).toBeDisabled();
  });

  it('removes a secondary connection and adds another one with its service chosen', async () => {
    const user = userEvent.setup();
    const { section } = await show();
    await secondaryTable(section);
    await user.click(section.getByRole('button', { name: 'Remove Nordic GSM' }));
    expect(section.getByText('No secondary connection.')).toBeInTheDocument();
    const menu = addMenu(section);
    // The supplier list loads after the chain: wait for it, then check that a supplier of the chain is not offered again.
    await within(menu).findByRole('option', { name: 'Gulf Server Hub' });
    expect(within(menu).queryByRole('option', { name: 'Rapid IMEI' })).not.toBeInTheDocument();
    await user.selectOptions(menu, 'Gulf Server Hub');
    await user.click(saveButton(section));
    expect(
      await section.findByText('Choose the service at Gulf Server Hub for the supplier you added.'),
    ).toBeInTheDocument();

    const picker = await section.findByLabelText('Service at Gulf Server Hub');
    await waitFor(() => expect(within(picker).getAllByRole('option').length).toBeGreaterThan(1));
    await user.selectOptions(picker, within(picker).getByRole('option', { name: /^Octoplus Credits x25/ }));
    expect(within(await secondaryTable(section)).getAllByRole('row')[1]).toHaveTextContent(
      'FallbackGulf Server HubOctoplus Credits x25',
    );
    await user.click(saveButton(section));
    expect(await toasts().findByText('Supplier links updated')).toBeInTheDocument();
    expect(await suppliersOf()).toEqual([3, 2]);
  });

  it('changes the primary supplier, asks for its service, and keeps the secondary connections in place', async () => {
    const user = userEvent.setup();
    const { section } = await show();
    await secondaryTable(section);
    await within(apiMenu(section)).findByRole('option', { name: 'Gulf Server Hub' });
    // Nordic GSM is a secondary connection, so the primary menu does not offer it, and "- None -" is off while one exists.
    expect(within(apiMenu(section)).queryByRole('option', { name: 'Nordic GSM' })).not.toBeInTheDocument();
    expect(within(apiMenu(section)).getByRole('option', { name: '- None -' })).toBeDisabled();
    await user.selectOptions(apiMenu(section), 'Gulf Server Hub');
    expect(apiMenu(section)).toHaveDisplayValue('Gulf Server Hub');
    expect(section.queryByRole('button', { name: 'Change' })).not.toBeInTheDocument();

    await user.click(saveButton(section));
    expect(
      await section.findByText('Choose the service at Gulf Server Hub for the supplier you added.'),
    ).toBeInTheDocument();
    const picker = await section.findByLabelText('Service at Gulf Server Hub');
    await waitFor(() => expect(within(picker).getAllByRole('option').length).toBeGreaterThan(1));
    await user.selectOptions(picker, within(picker).getByRole('option', { name: /^Octoplus Credits x25/ }));
    expect(await section.findByText('Octoplus Credits x25')).toBeInTheDocument();
    await user.click(saveButton(section));
    expect(await toasts().findByText('Supplier links updated')).toBeInTheDocument();
    expect(await suppliersOf()).toEqual([2, 1]);
  });

  it('opens the search of the supplier services on Change, and closes it on Keep', async () => {
    const user = userEvent.setup();
    const { section } = await show();
    await secondaryTable(section);
    await user.click(section.getByRole('button', { name: 'Change' }));
    expect(await section.findByLabelText('Service at Rapid IMEI')).toBeInTheDocument();
    await user.click(section.getByRole('button', { name: `Keep ${NAME}` }));
    expect(section.queryByLabelText('Service at Rapid IMEI')).not.toBeInTheDocument();
    expect(section.getByRole('button', { name: 'Change' })).toBeInTheDocument();
  });

  it('keeps the part open with the words of the server when the save is refused', async () => {
    const user = userEvent.setup();
    mockServer.use(
      http.put('*/admin/services/:id/supplier-links', () =>
        problem(
          409,
          'LINK_CONFLICT',
          'Cannot change the links',
          'Rapid IMEI still has orders on this service.',
        ),
      ),
    );
    const { section, onDirtyChange } = await show();
    await secondaryTable(section);
    await user.click(section.getByRole('button', { name: 'Move Nordic GSM up' }));
    await user.click(saveButton(section));
    await waitFor(() =>
      expect(section.getByRole('alert')).toHaveTextContent('Rapid IMEI still has orders on this service.'),
    );
    expect(apiMenu(section)).toHaveDisplayValue('Nordic GSM');
    expect(onDirtyChange).toHaveBeenLastCalledWith(true);
  });

  it('says false to the host when the part goes away with unsaved changes', async () => {
    const user = userEvent.setup();
    const { section, onDirtyChange, view } = await show();
    await secondaryTable(section);
    await user.click(section.getByRole('button', { name: 'Remove Nordic GSM' }));
    await waitFor(() => expect(onDirtyChange).toHaveBeenLastCalledWith(true));
    view.unmount();
    expect(onDirtyChange).toHaveBeenLastCalledWith(false);
  });

  it('makes the services lists and the service stale when the chain is saved', async () => {
    const user = userEvent.setup();
    const requests = recordRequests();
    const { section } = await show({ probes: true });
    await secondaryTable(section);
    const detailReads = () =>
      requests
        .sent()
        .filter((sent) => sent.method === 'GET' && sent.url.pathname === `/admin/services/${SERVICE}`).length;
    await waitFor(() => expect(rowReads).toBeGreaterThanOrEqual(1));
    await waitFor(() => expect(detailReads()).toBeGreaterThanOrEqual(1));
    const rowsBefore = rowReads;
    const detailBefore = detailReads();

    await user.click(section.getByRole('button', { name: 'Move Nordic GSM up' }));
    await user.click(saveButton(section));
    await waitFor(() => expect(rowReads).toBeGreaterThan(rowsBefore));
    await waitFor(() => expect(detailReads()).toBeGreaterThan(detailBefore));
  });
});

describe('a service with no connection yet', () => {
  const unlink = () => replaceSupplierLinks(SERVICE, { links: [] }).then(() => undefined);

  it('says that orders wait for manual dispatch, with nothing to save and no secondary connection to add yet', async () => {
    const { section, onDirtyChange } = await show({ prepare: unlink });
    expect(
      await section.findByText(/No supplier is linked\. Orders for this service wait for manual dispatch\./),
    ).toBeInTheDocument();
    expect(apiMenu(section)).toHaveDisplayValue('- None -');
    expect(section.getByText('Choose an API first.')).toBeInTheDocument();
    expect(section.getByText('No secondary connection.')).toBeInTheDocument();
    expect(addMenu(section)).toBeDisabled();
    expect(addMenu(section)).toHaveAttribute('title', 'Choose the primary API first');
    expect(saveButton(section)).toBeDisabled();
    expect(onDirtyChange).not.toHaveBeenCalledWith(true);
  });

  it('starts the chain: the supplier chosen becomes the primary when its service is chosen and saved', async () => {
    const user = userEvent.setup();
    let sent: unknown;
    mockServer.use(
      http.put('*/admin/services/:id/supplier-links', async ({ request }) => {
        sent = await request.clone().json();
        return undefined;
      }),
    );
    const { section } = await show({ prepare: unlink });
    await section.findByText(/No supplier is linked/);
    await within(apiMenu(section)).findByRole('option', { name: 'Nordic GSM' });
    await user.selectOptions(apiMenu(section), 'Nordic GSM');
    const picker = await section.findByLabelText('Service at Nordic GSM');
    await waitFor(() => expect(within(picker).getAllByRole('option').length).toBeGreaterThan(1));
    await user.selectOptions(picker, within(picker).getAllByRole('option')[1]);
    await user.click(saveButton(section));

    expect(await toasts().findByText(`${NAME} now uses 1 supplier, in order.`)).toBeInTheDocument();
    expect(sent).toMatchObject({ links: [{ priority: 1 }] });
    expect((sent as { links: unknown[] }).links).toHaveLength(1);
    await waitFor(() => expect(section.getByRole('button', { name: 'Change' })).toBeInTheDocument());
    expect(apiMenu(section)).toHaveDisplayValue('Nordic GSM');
  });

  it('unlinks the service when "- None -" takes out the only connection left, and says its orders wait for manual dispatch', async () => {
    const user = userEvent.setup();
    const { section } = await show();
    await secondaryTable(section);
    await user.click(section.getByRole('button', { name: 'Remove Nordic GSM' }));
    await user.selectOptions(apiMenu(section), '- None -');
    expect(apiMenu(section)).toHaveDisplayValue('- None -');
    await user.click(saveButton(section));
    expect(
      await toasts().findByText(`${NAME} has no supplier now. Its orders wait for manual dispatch.`),
    ).toBeInTheDocument();
    expect(await suppliersOf()).toEqual([]);
  });

  it('treats a service that the suppliers mock does not know as one with no connection', async () => {
    const { section } = await show({ serviceId: 9_999 });
    expect(await section.findByText(/No supplier is linked/)).toBeInTheDocument();
  });
});

describe('the supplier list behind the menus', () => {
  it('says the suppliers are loading, then offers them, instead of claiming there is no other supplier', async () => {
    let release: () => void = () => undefined;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    mockServer.use(
      http.get('*/admin/suppliers', async () => {
        await gate;
        return undefined; // on to the mock route
      }),
    );
    const { section } = await show();
    await secondaryTable(section);
    const menu = addMenu(section);
    expect(menu).toBeDisabled();
    expect(within(menu).getByRole('option')).toHaveTextContent('Loading suppliers…');
    expect(apiMenu(section)).toBeDisabled();
    expect(section.queryByText('No other supplier')).not.toBeInTheDocument();

    release();
    await within(menu).findByRole('option', { name: 'Gulf Server Hub' });
    expect(menu).toBeEnabled();
    expect(apiMenu(section)).toBeEnabled();
  });

  it('says the list could not be read, with Retry, and offers the suppliers once the read works', async () => {
    const user = userEvent.setup();
    mockServer.use(
      http.get('*/admin/suppliers', () => problem(404, 'NOT_FOUND', 'Not found', 'No supplier list here.')),
    );
    const { section } = await show();
    await secondaryTable(section);
    const menu = addMenu(section);
    expect(await section.findByText('Could not load the supplier list.')).toBeInTheDocument();
    expect(menu).toBeDisabled();
    expect(within(menu).getByRole('option')).toHaveTextContent('Supplier list unavailable');
    // The primary supplier is still shown from the chain, though its menu cannot offer others.
    expect(apiMenu(section)).toHaveDisplayValue('Rapid IMEI');
    expect(section.queryByText('No other supplier')).not.toBeInTheDocument();

    mockServer.resetHandlers();
    mockServer.use(...mocks.handlers);
    await user.click(section.getByRole('button', { name: 'Retry' }));
    await within(menu).findByRole('option', { name: 'Gulf Server Hub' });
    expect(section.queryByText('Could not load the supplier list.')).not.toBeInTheDocument();
  });
});

describe('permissions', () => {
  it('shows the chain with every control off and the missing permission named, without catalog:update', async () => {
    const { section, onDirtyChange } = await show({ canEdit: NO_UPDATE });
    await secondaryTable(section);
    for (const name of ['Move Nordic GSM up', 'Move Nordic GSM down', 'Remove Nordic GSM', 'Change']) {
      const button = section.getByRole('button', { name });
      expect(button).toBeDisabled();
      expect(button).toHaveAttribute('title', NO_UPDATE.title);
    }
    expect(apiMenu(section)).toBeDisabled();
    expect(addMenu(section)).toBeDisabled();
    expect(saveButton(section)).toBeDisabled();
    expect(section.getByText(NO_UPDATE.title as string)).toBeInTheDocument();
    expect(onDirtyChange).not.toHaveBeenCalledWith(true);
  });

  it('lets a role that may update the catalog but not read suppliers move and remove, not choose a supplier', async () => {
    const user = userEvent.setup();
    const { section, onDirtyChange } = await show({ permissions: ['catalog:read', 'catalog:update'] });
    await secondaryTable(section);
    expect(apiMenu(section)).toBeDisabled();
    expect(apiMenu(section)).toHaveAttribute('title', 'You need the suppliers:read permission');
    expect(apiMenu(section)).toHaveDisplayValue('Rapid IMEI');
    expect(addMenu(section)).toBeDisabled();
    expect(addMenu(section)).toHaveAttribute('title', 'You need the suppliers:read permission');
    await user.click(section.getByRole('button', { name: 'Remove Nordic GSM' }));
    await waitFor(() => expect(onDirtyChange).toHaveBeenLastCalledWith(true));
    expect(saveButton(section)).toBeEnabled();
  });
});
