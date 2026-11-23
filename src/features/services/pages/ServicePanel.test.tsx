// Tests for the service panel of the Catalog page, through the whole app against the dev mock API: it opens for the service the address
// names (on the loaded page or not), shows its header and the Activity section, closes with the button and Escape and drops its address
// (focus goes back to the row that was open), closes when its service is deleted, says so when the service is gone, leaves the table
// compact with the open row marked, and keeps every control's permission hint.
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ordersListPath } from '@/features/orders';
import { setupMockApi, signInAs } from '@/test/renderApp';
import { createService, deleteService, getService } from '../api';
import {
  CATALOG_ROUTE,
  catalogRoute,
  dialogOf,
  openServices,
  pickFromRowMenu,
  serviceRow,
  servicesTable,
} from '../test/servicesPage';

setupMockApi();
vi.setConfig({ testTimeout: 30_000 });

const ATT = 'AT&T USA Premier Unlock';
const CHIMERA = 'Chimera Tool 1 Month';

/** The query part of the address, without the `?`. */
const queryOf = (location: string | null) => (location ?? '').split('?')[1] ?? '';

/** The open service's panel, once it is on screen. */
async function panelOf(name: string) {
  return within(await screen.findByRole('complementary', { name }));
}

/** The header of the open service's panel (name, code, category, type, badges), apart from the sections below it. */
async function headerOf(name: string) {
  const header = (await screen.findByRole('complementary', { name })).querySelector<HTMLElement>('.drawer-h');
  if (!header) throw new Error('The panel has no header.');
  return within(header);
}

describe('opening the panel', () => {
  it('opens for the service the address names, with its code, category, type and the Activity section', async () => {
    await openServices(catalogRoute('open=5'));
    const panel = await panelOf(ATT);
    // The header only: the Details section below has an option for the same category and type.
    const header = await headerOf(ATT);
    expect(header.getByRole('heading', { level: 2, name: ATT })).toBeInTheDocument();
    expect(header.getByText('IMEI-ATT-USA')).toBeInTheDocument();
    expect(header.getByText(/Carrier unlock/)).toBeInTheDocument();
    expect(header.getByText('IMEI')).toBeInTheDocument();
    expect(panel.getByRole('heading', { level: 3, name: 'Activity' })).toBeInTheDocument();
  });

  it('opens from the name in a row, and shows another service when another name is picked', async () => {
    const user = userEvent.setup();
    const app = await openServices();
    await user.click((await serviceRow(ATT)).getByRole('button', { name: ATT }));
    await panelOf(ATT);
    expect(queryOf(app.location())).toBe('open=5');
    await user.click((await serviceRow(CHIMERA)).getByRole('button', { name: CHIMERA }));
    await panelOf(CHIMERA);
    expect(queryOf(app.location())).toBe('open=17');
    expect(screen.queryByRole('complementary', { name: ATT })).not.toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('reads a service that is not on the loaded page by its id', async () => {
    await openServices(catalogRoute('open=15'));
    await panelOf('Z3X Credits x10');
    expect((await headerOf('Z3X Credits x10')).getByText('SRV-Z3X-10')).toBeInTheDocument();
    // Page 1 of the table (A to Z) does not hold it.
    expect((await servicesTable()).queryByText('Z3X Credits x10')).not.toBeInTheDocument();
  });

  it('says so, with the server’s words, when the service cannot be read, and still closes', async () => {
    const user = userEvent.setup();
    const app = await openServices(catalogRoute('open=9999'));
    const panel = await panelOf('Service');
    expect(await panel.findByText('Could not load this service')).toBeInTheDocument();
    await user.click(panel.getByRole('button', { name: 'Close service' }));
    await waitFor(() => expect(app.location()).toBe(CATALOG_ROUTE));
  });

  it('moves to the part of the panel the address names, and leaves an unknown part alone', async () => {
    await openServices(catalogRoute('open=5&section=activity'));
    const panel = await panelOf(ATT);
    await waitFor(() => expect(panel.getByRole('heading', { level: 3, name: 'Activity' })).toHaveFocus());
  });

  it('opens without a section when the address names one that the panel does not have', async () => {
    await openServices(catalogRoute('open=5&section=nothing'));
    const panel = await panelOf(ATT);
    expect(panel.getByRole('heading', { level: 3, name: 'Activity' })).not.toHaveFocus();
  });

  it('writes the part a badge names into the address, for the service that is open', async () => {
    const user = userEvent.setup();
    const app = await openServices(catalogRoute('open=17'));
    const panel = await panelOf(CHIMERA);
    await user.click(panel.getByRole('button', { name: 'Below floor' }));
    expect(queryOf(app.location())).toBe('open=17&section=prices');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});

describe('closing the panel', () => {
  it('closes with its button and drops the service and the section from the address, keeping the rest', async () => {
    const user = userEvent.setup();
    const app = await openServices(catalogRoute('q=unlock&open=5&section=activity'));
    const panel = await panelOf(ATT);
    await user.click(panel.getByRole('button', { name: 'Close service' }));
    await waitFor(() => expect(app.location()).toBe(catalogRoute('q=unlock')));
    expect(screen.queryByRole('complementary', { name: ATT })).not.toBeInTheDocument();
  });

  it('closes on Escape while focus is inside the panel', async () => {
    const user = userEvent.setup();
    const app = await openServices(catalogRoute('open=5'));
    const panel = await panelOf(ATT);
    panel.getByRole('heading', { level: 2, name: ATT }).focus();
    await user.keyboard('{Escape}');
    await waitFor(() => expect(app.location()).toBe(CATALOG_ROUTE));
    expect(screen.queryByRole('complementary', { name: ATT })).not.toBeInTheDocument();
    // The panel took focus with it: it goes back to the name of the row that was open.
    await waitFor(async () =>
      expect((await servicesTable()).getByRole('button', { name: ATT })).toHaveFocus(),
    );
  });

  it('puts focus back on the name button of the row that was open when the close button is used', async () => {
    const user = userEvent.setup();
    await openServices();
    await user.click((await serviceRow(ATT)).getByRole('button', { name: ATT }));
    const panel = await panelOf(ATT);
    await user.click(panel.getByRole('button', { name: 'Close service' }));
    await waitFor(async () =>
      expect((await servicesTable()).getByRole('button', { name: ATT })).toHaveFocus(),
    );
  });

  it('puts focus on the table when the row that was open is not on the page', async () => {
    const user = userEvent.setup();
    await openServices(catalogRoute('open=15'));
    const panel = await panelOf('Z3X Credits x10');
    await user.click(panel.getByRole('button', { name: 'Close service' }));
    const table = await screen.findByRole('table', { name: 'Services' });
    await waitFor(() => {
      expect(document.activeElement).not.toBe(document.body);
      expect(document.activeElement).toContainElement(table);
    });
  });
});

describe('a service that is gone', () => {
  const NEW_SERVICE = {
    name: 'Temporary Check',
    code: 'TMP-PANEL',
    categoryId: 1,
    type: 'imei',
    slaMinutes: 5,
    basePrice: '1.0000',
  } as const;

  it('closes the panel of the service that is deleted from the row menu, keeping the rest of the address', async () => {
    const user = userEvent.setup();
    await signInAs();
    const made = await createService(NEW_SERVICE);
    const app = await openServices(catalogRoute(`q=Temporary&open=${made.id}`));
    await panelOf('Temporary Check');
    await pickFromRowMenu(user, 'Temporary Check', 'Delete…');
    await user.click(dialogOf('Delete Temporary Check?').getByRole('button', { name: 'Delete service' }));
    await waitFor(() =>
      expect(screen.queryByRole('complementary', { name: 'Temporary Check' })).not.toBeInTheDocument(),
    );
    expect(app.location()).toBe(catalogRoute('q=Temporary'));
  });

  it('shows the server’s answer instead of the row and the copy it still holds, when the next read says the service is gone', async () => {
    const user = userEvent.setup();
    await signInAs();
    const made = await createService(NEW_SERVICE);
    const app = await openServices(catalogRoute(`q=Temporary&open=${made.id}`));
    const panel = await panelOf('Temporary Check');
    expect(panel.getAllByRole('button', { name: 'Save changes' }).length).toBeGreaterThan(0);
    await user.click(panel.getByRole('button', { name: 'Close service' }));
    await waitFor(() => expect(app.location()).toBe(catalogRoute('q=Temporary')));
    // Someone else deletes it: the table still shows its row, and the app still holds its record, until they are read again.
    await deleteService(made.id);
    await user.click((await serviceRow('Temporary Check')).getByRole('button', { name: 'Temporary Check' }));
    const gone = await panelOf('Service');
    expect(await gone.findByText('Could not load this service')).toBeInTheDocument();
    expect(gone.queryAllByRole('button', { name: 'Save changes' })).toHaveLength(0);
  });
});

describe('the table beside the panel', () => {
  const headers = async () =>
    (await servicesTable()).getAllByRole('columnheader').map((cell) => cell.textContent);

  it('keeps the columns a person acts on while the panel is open, and all of them again after', async () => {
    const user = userEvent.setup();
    await openServices(catalogRoute('open=5'));
    const panel = await panelOf(ATT);
    const open = await headers();
    for (const name of ['Service', 'Merchant price', 'On shop', 'Enabled']) expect(open).toContain(name);
    for (const name of ['Type', 'Supplier and cost', 'Shop price']) expect(open).not.toContain(name);
    await user.click(panel.getByRole('button', { name: 'Close service' }));
    await waitFor(async () => expect(await headers()).toContain('Type'));
    expect(await headers()).toContain('Supplier and cost');
  });

  it('marks the row of the open service', async () => {
    await openServices(catalogRoute('open=5'));
    await panelOf(ATT);
    const table = await servicesTable();
    const mark = table.getByRole('button', { name: ATT });
    expect(mark).toHaveAttribute('aria-current', 'true');
    expect(mark.closest('tr')).toHaveAttribute('data-cursor');
    const other = table.getByRole('button', { name: CHIMERA });
    expect(other).not.toHaveAttribute('aria-current');
    expect(other.closest('tr')).not.toHaveAttribute('data-cursor');
  });

  it('keeps the table and its filters as they were', async () => {
    await openServices(catalogRoute('open=5&q=unlock'));
    await panelOf(ATT);
    expect(await screen.findByText(/^\d+ services?$/)).toBeInTheDocument();
    expect(screen.getByRole('searchbox')).toHaveValue('unlock');
  });
});

describe('the Activity section', () => {
  it('shows the SLA, how orders are handled and the links to the orders and to the price trace', async () => {
    await openServices(catalogRoute('open=5'));
    const panel = await panelOf(ATT);
    expect(panel.getByText('2d')).toBeInTheDocument();
    expect(panel.getByRole('switch', { name: `Automation for ${ATT}` })).toHaveAttribute(
      'aria-checked',
      'true',
    );
    expect(panel.getByText('Automatic')).toBeInTheDocument();
    expect(panel.getByText('Orders go to the supplier automatically.')).toBeInTheDocument();
    expect(panel.getByRole('link', { name: 'See orders' })).toHaveAttribute(
      'href',
      ordersListPath({ tab: 'all', q: ATT }),
    );
    expect(panel.getByRole('link', { name: 'Trace a merchant price' })).toHaveAttribute(
      'href',
      catalogRoute('view=settings&tab=resolver&service=5'),
    );
  });

  it('shows a service that waits for an operator as manual', async () => {
    await openServices(catalogRoute('open=11'));
    const panel = await panelOf('MDM Removal, iPhone Premium');
    expect(panel.getByRole('switch', { name: 'Automation for MDM Removal, iPhone Premium' })).toHaveAttribute(
      'aria-checked',
      'false',
    );
    expect(panel.getByText('Manual')).toBeInTheDocument();
    expect(panel.getByText('3d')).toBeInTheDocument();
  });

  it('keeps the switch it was used on (so its focus stays) when the saved service comes back', async () => {
    const user = userEvent.setup();
    await openServices(catalogRoute('open=5'));
    const panel = await panelOf(ATT);
    const automation = panel.getByRole('switch', { name: `Automation for ${ATT}` });
    await user.click(automation);
    await waitFor(() => expect(automation).toHaveAttribute('aria-checked', 'false'));
    // The same element, not a new one: a section that only follows its props is never mounted again by a save.
    expect(panel.getByRole('switch', { name: `Automation for ${ATT}` })).toBe(automation);
  });

  it('turns automation off, says so, and the switch follows the saved service', async () => {
    const user = userEvent.setup();
    await openServices(catalogRoute('open=5'));
    const panel = await panelOf(ATT);
    await user.click(panel.getByRole('switch', { name: `Automation for ${ATT}` }));
    expect(await screen.findByText(`Automation off for ${ATT}`)).toBeInTheDocument();
    expect((await getService(5)).executionMode).toBe('manual');
    await waitFor(() =>
      expect(panel.getByRole('switch', { name: `Automation for ${ATT}` })).toHaveAttribute(
        'aria-checked',
        'false',
      ),
    );
    expect(panel.getByText('Manual')).toBeInTheDocument();
  });
});

describe('permissions in the panel', () => {
  it('disables each control of a reader and names the permission it needs', async () => {
    await openServices(catalogRoute('open=5'), { permissions: ['catalog:read'] });
    const panel = await panelOf(ATT);
    const automation = panel.getByRole('switch', { name: `Automation for ${ATT}` });
    expect(automation).toBeDisabled();
    expect(automation).toHaveAttribute('title', 'You need the catalog:update permission');
    const orders = panel.getByRole('button', { name: 'See orders' });
    expect(orders).toBeDisabled();
    expect(orders).toHaveAttribute('title', 'You need the orders:read permission');
    const trace = panel.getByRole('button', { name: 'Trace a merchant price' });
    expect(trace).toBeDisabled();
    expect(trace).toHaveAttribute('title', 'You need the pricing:read permission');
    expect(panel.queryByRole('link', { name: 'See orders' })).not.toBeInTheDocument();
  });
});
