// Tests for the Suppliers section of the Catalog panel, run inside the real app shell against the feature's mock API: it reads the chain of a
// service, edits it (also for a service with no link yet), saves it whole and makes the Catalog's reads stale, and it keeps each control's
// permission. The section is mounted in a small route of its own, the way the panel mounts it.
import { useOne } from '@refinedev/core';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http } from 'msw';
import { Route } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SidePanelSection } from '@/components/ui';
import { mockServer } from '@/mocks/node';
import { problem } from '@/mocks/problem';
import { CATALOG_ROWS_KEY, useApiQuery } from '@/lib/query';
import { mockMe, renderShell, setupMockApi, signInAs } from '@/test/renderApp';
import { recordRequests } from '../test/requests';
import { replaceSupplierLinks } from '../api';
import { mocks, suppliersState } from '../mocks';
import { toasts } from '../test/suppliersPage';
import type { EditLock } from '../lib/links';
import { SuppliersSection } from './SuppliersSection';

/** How many times the Catalog rows probe was read: a save must make it stale. */
let rowReads = 0;

setupMockApi();
vi.setConfig({ testTimeout: 30_000 });
beforeEach(() => {
  rowReads = 0;
  mockServer.use(...mocks.handlers);
});
afterEach(() => vi.restoreAllMocks());

// Service 1 of the mock seed: Rapid IMEI is its primary supplier and Nordic GSM its fallback.
const SERVICE = 1;
const NAME = 'iCloud Clean / Lost Check';
const EDITABLE: EditLock = { disabled: false };
const NO_UPDATE: EditLock = { disabled: true, title: 'You need the catalog:update permission' };

/** Stands in for the table and the panel's detail: two reads that a save of the chain must make stale. */
function Probes() {
  useOne({ resource: 'services', id: SERVICE });
  useApiQuery({
    queryKey: [...CATALOG_ROWS_KEY, 'probe'],
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
  /** Runs once the staff member is signed in, before the section is shown. */
  prepare?: () => Promise<void>;
};

/** Mounts the section for a service in the panel's frame and returns that region, once the chain (or its error) is on screen. */
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
          <SidePanelSection id="service-panel-suppliers" title="Suppliers">
            <SuppliersSection
              serviceId={serviceId}
              serviceName={NAME}
              canEdit={canEdit}
              onDirtyChange={onDirtyChange}
            />
          </SidePanelSection>
        </>
      }
    />,
  );
  const section = within(await screen.findByRole('region', { name: 'Suppliers' }, { timeout: 10_000 }));
  return { section, onDirtyChange, view };
}

const chainList = (section: ReturnType<typeof within>) =>
  section.findByRole('list', { name: 'Suppliers in order' });

describe('the chain of a service', () => {
  it('shows the primary first and the fallbacks after it, with nothing to save yet', async () => {
    const { section, onDirtyChange } = await show();
    const items = within(await chainList(section)).getAllByRole('listitem');
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent('PrimaryRapid IMEI' + NAME);
    expect(items[1]).toHaveTextContent('FallbackNordic GSM');
    expect(section.getByRole('button', { name: 'Move Rapid IMEI up' })).toBeDisabled();
    expect(section.getByRole('button', { name: 'Move Nordic GSM down' })).toBeDisabled();
    expect(section.getByRole('button', { name: 'Save links' })).toBeDisabled();
    expect(onDirtyChange).not.toHaveBeenCalledWith(true);
  });

  it('reads the chain of the service it is given, from the address of that service', async () => {
    const requests = recordRequests();
    const { section } = await show();
    await chainList(section);
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
    expect(await chainList(section)).toBeInTheDocument();
  });
});

describe('editing and saving', () => {
  it('reorders the chain, tells the panel it is unsaved, and saves it whole in the new order', async () => {
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
    await chainList(section);
    await user.click(section.getByRole('button', { name: 'Move Nordic GSM up' }));
    expect(section.getAllByRole('listitem')[0]).toHaveTextContent('PrimaryNordic GSM');
    await waitFor(() => expect(onDirtyChange).toHaveBeenLastCalledWith(true));

    await user.click(section.getByRole('button', { name: 'Save links' }));
    expect(await section.findByText('Links saved')).toBeInTheDocument();
    expect(await toasts().findByText('Supplier links updated')).toBeInTheDocument();
    expect(sent).toMatchObject({ links: [{ priority: 1 }, { priority: 2 }] });
    const state = await suppliersState();
    const saved = state.links.filter((link) => link.serviceId === SERVICE);
    expect(saved.map((link) => state.catalogue.find(link.supplierServiceId)?.supplierId)).toEqual([1, 3]);

    // The chain is read again: Nordic GSM stays the primary and there is nothing left to save.
    await waitFor(() => expect(onDirtyChange).toHaveBeenLastCalledWith(false));
    expect(section.getAllByRole('listitem')[0]).toHaveTextContent('PrimaryNordic GSM');
    expect(section.getByRole('button', { name: 'Save links' })).toBeDisabled();
  });

  it('removes a supplier and adds another one with its service picked', async () => {
    const user = userEvent.setup();
    const { section } = await show();
    await chainList(section);
    await user.click(section.getByRole('button', { name: 'Remove Nordic GSM' }));
    const menu = section.getByLabelText('Add a supplier');
    // The supplier list loads after the chain: wait for it, then check that a supplier of the chain is not offered again.
    await within(menu).findByRole('option', { name: 'Gulf Server Hub' });
    expect(within(menu).queryByRole('option', { name: 'Rapid IMEI' })).not.toBeInTheDocument();
    await user.selectOptions(menu, 'Gulf Server Hub');
    await user.click(section.getByRole('button', { name: 'Save links' }));
    expect(
      await section.findByText('Choose the service at Gulf Server Hub for the supplier you added.'),
    ).toBeInTheDocument();

    const picker = await section.findByLabelText('Service at Gulf Server Hub');
    await waitFor(() => expect(within(picker).getAllByRole('option').length).toBeGreaterThan(1));
    await user.selectOptions(picker, within(picker).getByRole('option', { name: /^Octoplus Credits x25/ }));
    expect(section.getAllByRole('listitem')[1]).toHaveTextContent(
      'FallbackGulf Server HubOctoplus Credits x25',
    );
    await user.click(section.getByRole('button', { name: 'Save links' }));
    expect(await toasts().findByText('Supplier links updated')).toBeInTheDocument();

    const state = await suppliersState();
    const saved = state.links.filter((link) => link.serviceId === SERVICE);
    expect(saved.map((link) => state.catalogue.find(link.supplierServiceId)?.supplierId)).toEqual([3, 2]);
  });

  it('keeps the section open with the words of the server when the save is refused', async () => {
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
    await chainList(section);
    await user.click(section.getByRole('button', { name: 'Move Nordic GSM up' }));
    await user.click(section.getByRole('button', { name: 'Save links' }));
    await waitFor(() =>
      expect(section.getByRole('alert')).toHaveTextContent('Rapid IMEI still has orders on this service.'),
    );
    expect(section.getAllByRole('listitem')[0]).toHaveTextContent('PrimaryNordic GSM');
    expect(onDirtyChange).toHaveBeenLastCalledWith(true);
  });

  it('says false to the panel when the section goes away with unsaved changes', async () => {
    const user = userEvent.setup();
    const { section, onDirtyChange, view } = await show();
    await chainList(section);
    await user.click(section.getByRole('button', { name: 'Remove Nordic GSM' }));
    await waitFor(() => expect(onDirtyChange).toHaveBeenLastCalledWith(true));
    view.unmount();
    expect(onDirtyChange).toHaveBeenLastCalledWith(false);
  });

  it('makes the Catalog rows and the service detail stale when the chain is saved', async () => {
    const user = userEvent.setup();
    const requests = recordRequests();
    const { section } = await show({ probes: true });
    await chainList(section);
    const detailReads = () =>
      requests
        .sent()
        .filter((sent) => sent.method === 'GET' && sent.url.pathname === `/admin/services/${SERVICE}`).length;
    await waitFor(() => expect(rowReads).toBeGreaterThanOrEqual(1));
    await waitFor(() => expect(detailReads()).toBeGreaterThanOrEqual(1));
    const rowsBefore = rowReads;
    const detailBefore = detailReads();

    await user.click(section.getByRole('button', { name: 'Move Nordic GSM up' }));
    await user.click(section.getByRole('button', { name: 'Save links' }));
    await waitFor(() => expect(rowReads).toBeGreaterThan(rowsBefore));
    await waitFor(() => expect(detailReads()).toBeGreaterThan(detailBefore));
  });
});

describe('a service with no link yet', () => {
  const unlink = () => replaceSupplierLinks(SERVICE, { links: [] }).then(() => undefined);

  it('says that orders wait for manual dispatch, with nothing to save and a menu to add the first supplier', async () => {
    const { section, onDirtyChange } = await show({ prepare: unlink });
    expect(
      await section.findByText(/No supplier is linked\. Orders for this service wait for manual dispatch\./),
    ).toBeInTheDocument();
    expect(section.queryByRole('list', { name: 'Suppliers in order' })).not.toBeInTheDocument();
    expect(section.getByRole('button', { name: 'Save links' })).toBeDisabled();
    await waitFor(() => expect(section.getByLabelText('Add a supplier')).toBeEnabled());
    expect(onDirtyChange).not.toHaveBeenCalledWith(true);
  });

  it('starts the chain: the first supplier added becomes the primary when its service is picked and saved', async () => {
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
    const startMenu = section.getByLabelText('Add a supplier');
    await within(startMenu).findByRole('option', { name: 'Nordic GSM' });
    await user.selectOptions(startMenu, 'Nordic GSM');
    const picker = await section.findByLabelText('Service at Nordic GSM');
    await waitFor(() => expect(within(picker).getAllByRole('option').length).toBeGreaterThan(1));
    await user.selectOptions(picker, within(picker).getAllByRole('option')[1]);
    await user.click(section.getByRole('button', { name: 'Save links' }));

    expect(await toasts().findByText(`${NAME} now uses 1 supplier, in order.`)).toBeInTheDocument();
    expect(sent).toMatchObject({ links: [{ priority: 1 }] });
    expect((sent as { links: unknown[] }).links).toHaveLength(1);
    await waitFor(() => expect(section.getAllByRole('listitem')[0]).toHaveTextContent('PrimaryNordic GSM'));
  });

  it('treats a service that the suppliers mock does not know as one with no link', async () => {
    const { section } = await show({ serviceId: 9_999 });
    expect(await section.findByText(/No supplier is linked/)).toBeInTheDocument();
  });
});

describe('the supplier list behind the "Add a supplier" menu', () => {
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
    await chainList(section);
    const menu = section.getByLabelText('Add a supplier');
    expect(menu).toBeDisabled();
    expect(within(menu).getByRole('option')).toHaveTextContent('Loading suppliers…');
    expect(section.queryByText('No other supplier')).not.toBeInTheDocument();

    release();
    await within(menu).findByRole('option', { name: 'Gulf Server Hub' });
    expect(menu).toBeEnabled();
  });

  it('says the list could not be read, with Retry, and offers the suppliers once the read works', async () => {
    const user = userEvent.setup();
    mockServer.use(
      http.get('*/admin/suppliers', () => problem(404, 'NOT_FOUND', 'Not found', 'No supplier list here.')),
    );
    const { section } = await show();
    await chainList(section);
    const menu = section.getByLabelText('Add a supplier');
    expect(await section.findByText('Could not load the supplier list.')).toBeInTheDocument();
    expect(menu).toBeDisabled();
    expect(within(menu).getByRole('option')).toHaveTextContent('Supplier list unavailable');
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
    await chainList(section);
    for (const name of ['Move Nordic GSM up', 'Move Rapid IMEI down', 'Remove Rapid IMEI']) {
      const button = section.getByRole('button', { name });
      expect(button).toBeDisabled();
      expect(button).toHaveAttribute('title', NO_UPDATE.title);
    }
    expect(section.getByLabelText('Add a supplier')).toBeDisabled();
    expect(section.getByRole('button', { name: 'Save links' })).toBeDisabled();
    expect(section.getByText(NO_UPDATE.title as string)).toBeInTheDocument();
    expect(onDirtyChange).not.toHaveBeenCalledWith(true);
  });

  it('lets a role that may update the catalog but not read suppliers move and remove, not add', async () => {
    const user = userEvent.setup();
    const { section, onDirtyChange } = await show({ permissions: ['catalog:read', 'catalog:update'] });
    await chainList(section);
    const menu = section.getByLabelText('Add a supplier');
    expect(menu).toBeDisabled();
    expect(menu).toHaveAttribute('title', 'You need the suppliers:read permission');
    await user.click(section.getByRole('button', { name: 'Remove Nordic GSM' }));
    await waitFor(() => expect(onDirtyChange).toHaveBeenLastCalledWith(true));
    expect(section.getByRole('button', { name: 'Save links' })).toBeEnabled();
  });
});
