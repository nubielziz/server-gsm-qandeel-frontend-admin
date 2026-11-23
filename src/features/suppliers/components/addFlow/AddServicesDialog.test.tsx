// Tests for the Add services frame: step 1 (the suppliers, the two ways, a service of my own), what the staff member's permissions lock, the
// empty and failed lists, the hand-over to a path dialog and back, and the opening address that starts a path at once. They run
// against the suppliers mock API, with stand-ins for the two path dialogs (which other parts of the flow build).
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AppProviders } from '@/app/App';
import { mockServer } from '@/mocks/node';
import { problem } from '@/mocks/problem';
import { mockMe, setupMockApi, signInAs } from '@/test/renderApp';
import { mocks, suppliersState } from '../../mocks';
import { AddServicesDialog, type AddServicesDialogProps } from './AddServicesDialog';
import type { AddFlowPathProps } from './types';

setupMockApi();
vi.setConfig({ testTimeout: 20_000 });
// The shared lookup mock also answers `GET /admin/suppliers`; the feature's own routes go first.
beforeEach(() => mockServer.use(...mocks.handlers));

// Seed ids: 1 Nordic GSM (Healthy, Dhru), 2 Gulf Server Hub, 3 Rapid IMEI (Degraded, REST), six suppliers in all.
const NORDIC = /Nordic GSM/;

/** A path dialog's stand-in: says which path it is and for whom, and has one button for each prop it was given. */
function PathStandIn({ label, supplier, onBack, onClose, onDone }: AddFlowPathProps & { label: string }) {
  return (
    <section aria-label={label}>
      <p>
        {label} for {supplier.name}
      </p>
      <button type="button" onClick={onBack}>
        Back to step 1
      </button>
      <button type="button" onClick={onClose}>
        Close the flow
      </button>
      <button type="button" onClick={() => onDone?.()}>
        Report done
      </button>
    </section>
  );
}

const Groups = (props: AddFlowPathProps) => <PathStandIn label="Groups path" {...props} />;
const Singles = (props: AddFlowPathProps) => <PathStandIn label="Singles path" {...props} />;

/** The flow inside the app's providers; `over` changes what a test is about. */
function flow(over: Partial<AddServicesDialogProps> = {}) {
  return (
    <MemoryRouter>
      <AppProviders>
        <AddServicesDialog
          open
          paths={{ groups: Groups, singles: Singles }}
          onOwnService={vi.fn()}
          onClose={vi.fn()}
          {...over}
        />
      </AppProviders>
    </MemoryRouter>
  );
}

/** Signs in (with fewer permissions when asked) and opens the flow; the caller waits for what it needs to see. */
async function openFlow(
  over: Partial<AddServicesDialogProps> = {},
  options: { permissions?: string[] } = {},
) {
  await signInAs();
  if (options.permissions) mockMe({ id: 1, name: 'Rami K.', permissions: options.permissions });
  const view = render(flow(over));
  return { view, user: userEvent.setup() };
}

/** Step 1 once it is on screen and its controls are drawn (they wait for the staff member's permissions). */
async function stepOne() {
  const dialog = within(await screen.findByRole('dialog', { name: 'Add services' }));
  await dialog.findByRole('button', { name: 'A service of my own' });
  return dialog;
}

describe('step 1, Where from', () => {
  it('names the three steps with the first one current, and lists the suppliers with their state', async () => {
    await openFlow();
    const dialog = await stepOne();
    const steps = within(dialog.getByRole('list', { name: 'Steps' }));
    expect(steps.getAllByRole('listitem').map((item) => item.textContent)).toEqual([
      '1Where from',
      '2Prices and category',
      '3Finish',
    ]);
    expect(steps.getByText('Where from').closest('li')).toHaveAttribute('aria-current', 'step');

    expect(await dialog.findAllByRole('radio')).toHaveLength(6);
    const nordic = within(
      (await dialog.findByRole('radio', { name: NORDIC })).closest('label') as HTMLElement,
    );
    expect(nordic.getByText('Healthy')).toBeInTheDocument();
    expect(nordic.getByText('Dhru Fusion 6.1')).toBeInTheDocument();
    const rapid = within(dialog.getByRole('radio', { name: /Rapid IMEI/ }).closest('label') as HTMLElement);
    expect(rapid.getByText('Degraded')).toBeInTheDocument();
    expect(rapid.getByText('REST v2')).toBeInTheDocument();
  });

  it('keeps Whole groups and Single services locked until a supplier is picked', async () => {
    const { user } = await openFlow();
    const dialog = await stepOne();
    const whole = dialog.getByRole('button', { name: 'Whole groups' });
    const single = dialog.getByRole('button', { name: 'Single services' });
    expect(whole).toBeDisabled();
    expect(whole).toHaveAttribute('title', 'Pick a supplier first');
    expect(single).toBeDisabled();

    await user.click(await dialog.findByRole('radio', { name: NORDIC }));
    expect(whole).toBeEnabled();
    expect(single).toBeEnabled();
  });

  it('calls onOwnService for "A service of my own", and onClose for Cancel', async () => {
    const onOwnService = vi.fn();
    const onClose = vi.fn();
    const { user } = await openFlow({ onOwnService, onClose });
    const dialog = await stepOne();

    await user.click(dialog.getByRole('button', { name: 'A service of my own' }));
    expect(onOwnService).toHaveBeenCalledTimes(1);
    expect(onClose).not.toHaveBeenCalled();

    await user.click(dialog.getByRole('button', { name: 'Cancel' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('lists a disabled supplier but cannot choose it, and says what to do', async () => {
    (await suppliersState()).suppliers.patch(3, { status: 'disabled' });
    const { user } = await openFlow();
    const dialog = await stepOne();
    const rapid = await dialog.findByRole('radio', { name: /Rapid IMEI/ });
    const line = within(rapid.closest('label') as HTMLElement);
    expect(rapid).toBeDisabled();
    expect(line.getByText('Disabled')).toBeInTheDocument();
    expect(line.getByText('Switch it on from the Suppliers page to add its services.')).toBeInTheDocument();

    await user.click(rapid);
    expect(rapid).not.toBeChecked();
    expect(dialog.getByRole('button', { name: 'Whole groups' })).toBeDisabled();
  });
});

describe('what the permissions lock', () => {
  it('locks the choice of a supplier, with the reason, without suppliers:read', async () => {
    await openFlow({}, { permissions: ['catalog:read', 'catalog:create'] });
    const dialog = await stepOne();
    expect(
      await dialog.findByText('You need the suppliers:read permission to pick a supplier.'),
    ).toBeInTheDocument();
    expect(dialog.queryByRole('radio')).not.toBeInTheDocument();
    for (const name of ['Whole groups', 'Single services']) {
      const button = dialog.getByRole('button', { name });
      expect(button).toBeDisabled();
      expect(button).toHaveAttribute('title', 'You need the suppliers:read permission');
    }
  });

  it('locks the two ways and the service of my own, with the reason, without catalog:create', async () => {
    const { user } = await openFlow({}, { permissions: ['suppliers:read', 'catalog:read'] });
    const dialog = await stepOne();
    await user.click(await dialog.findByRole('radio', { name: NORDIC }));
    for (const name of ['Whole groups', 'Single services', 'A service of my own']) {
      const button = dialog.getByRole('button', { name });
      expect(button).toBeDisabled();
      expect(button).toHaveAttribute('title', 'You need the catalog:create permission');
    }
  });
});

describe('the list of suppliers', () => {
  it('says there are no suppliers and links to the Suppliers page, but still offers a service of my own', async () => {
    mockServer.use(
      http.get('*/admin/suppliers', () => HttpResponse.json([], { headers: { 'x-total-count': '0' } })),
    );
    await openFlow();
    const dialog = await stepOne();
    expect(await dialog.findByText('No suppliers connected')).toBeInTheDocument();
    expect(dialog.getByRole('link', { name: 'Open Suppliers' })).toHaveAttribute('href', '/suppliers');
    expect(dialog.queryByRole('button', { name: 'Whole groups' })).not.toBeInTheDocument();
    expect(dialog.getByRole('button', { name: 'A service of my own' })).toBeEnabled();
  });

  it('shows the server’s error with Retry, and lists the suppliers when Retry works', async () => {
    let failing = true;
    mockServer.use(
      http.get('*/admin/suppliers', () =>
        failing
          ? problem(500, 'SUPPLIERS_FAILED', 'Suppliers are not available', 'The database is restarting.')
          : undefined,
      ),
    );
    const { user } = await openFlow();
    const dialog = await stepOne();
    // A server error is read once more before the list gives up (the app's retry rule), so allow for that wait.
    expect(
      await dialog.findByText('Could not load the suppliers', {}, { timeout: 5000 }),
    ).toBeInTheDocument();
    expect(dialog.getByText('The database is restarting.')).toBeInTheDocument();
    expect(dialog.queryByRole('button', { name: 'Whole groups' })).not.toBeInTheDocument();

    failing = false;
    await user.click(dialog.getByRole('button', { name: 'Retry' }));
    expect(await dialog.findByRole('radio', { name: NORDIC })).toBeInTheDocument();
  });
});

describe('handing over to a path', () => {
  it('shows the groups path for the supplier, takes its own dialog away, and returns with the supplier marked', async () => {
    const { user } = await openFlow();
    const dialog = await stepOne();
    await user.click(await dialog.findByRole('radio', { name: NORDIC }));
    await user.click(dialog.getByRole('button', { name: 'Whole groups' }));

    const path = within(await screen.findByRole('region', { name: 'Groups path' }));
    expect(path.getByText('Groups path for Nordic GSM')).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    await user.click(path.getByRole('button', { name: 'Back to step 1' }));
    const again = await stepOne();
    expect(await again.findByRole('radio', { name: NORDIC })).toBeChecked();
    expect(screen.queryByRole('region', { name: 'Groups path' })).not.toBeInTheDocument();
  });

  it('shows the singles path for Single services', async () => {
    const { user } = await openFlow();
    const dialog = await stepOne();
    await user.click(await dialog.findByRole('radio', { name: /Gulf Server Hub/ }));
    await user.click(dialog.getByRole('button', { name: 'Single services' }));
    const path = within(await screen.findByRole('region', { name: 'Singles path' }));
    expect(path.getByText('Singles path for Gulf Server Hub')).toBeInTheDocument();
  });

  it('gives the path the flow’s close and done, so one call each reaches the host', async () => {
    const onClose = vi.fn();
    const onDone = vi.fn();
    const { user } = await openFlow({ onClose, onDone });
    const dialog = await stepOne();
    await user.click(await dialog.findByRole('radio', { name: NORDIC }));
    await user.click(dialog.getByRole('button', { name: 'Whole groups' }));
    const path = within(await screen.findByRole('region', { name: 'Groups path' }));

    await user.click(path.getByRole('button', { name: 'Report done' }));
    expect(onDone).toHaveBeenCalledTimes(1);
    await user.click(path.getByRole('button', { name: 'Close the flow' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

describe('opening on a supplier and a way', () => {
  it('opens the path at once for a supplier and a way', async () => {
    await openFlow({ initial: { supplierId: 1, from: 'groups' } });
    expect(await screen.findByText('Groups path for Nordic GSM')).toBeInTheDocument();
  });

  it('opens the singles path for the other way', async () => {
    await openFlow({ initial: { supplierId: 2, from: 'services' } });
    expect(await screen.findByText('Singles path for Gulf Server Hub')).toBeInTheDocument();
  });

  it('goes back to step 1 with the supplier marked, and does not open the path again', async () => {
    const { user } = await openFlow({ initial: { supplierId: 1, from: 'groups' } });
    await user.click(await screen.findByRole('button', { name: 'Back to step 1' }));
    const dialog = await stepOne();
    expect(await dialog.findByRole('radio', { name: NORDIC })).toBeChecked();
    expect(screen.queryByRole('region', { name: 'Groups path' })).not.toBeInTheDocument();
  });

  it('shows step 1 with a line when the supplier is not in the list', async () => {
    await openFlow({ initial: { supplierId: 99, from: 'groups' } });
    const dialog = await stepOne();
    expect(
      await dialog.findByText('That supplier is not among your connected suppliers. Pick one below.'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Groups path' })).not.toBeInTheDocument();
  });

  it('shows step 1 with a line when the supplier is disabled', async () => {
    (await suppliersState()).suppliers.patch(3, { status: 'disabled' });
    await openFlow({ initial: { supplierId: 3, from: 'services' } });
    const dialog = await stepOne();
    expect(
      await dialog.findByText(
        'Rapid IMEI is disabled, so its services cannot be added. Switch it on from the Suppliers page, or pick another supplier.',
      ),
    ).toBeInTheDocument();
    expect(await dialog.findByRole('radio', { name: /Rapid IMEI/ })).not.toBeChecked();
    expect(screen.queryByRole('region', { name: 'Singles path' })).not.toBeInTheDocument();
  });

  it('only marks the supplier when the address names no way', async () => {
    await openFlow({ initial: { supplierId: 2 } });
    const dialog = await stepOne();
    expect(await dialog.findByRole('radio', { name: /Gulf Server Hub/ })).toBeChecked();
    expect(dialog.queryByText(/is not among your connected suppliers/)).not.toBeInTheDocument();
  });
});

describe('opening and closing', () => {
  it('shows nothing while it is closed', async () => {
    await openFlow({ open: false });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('starts from nothing each time it is opened', async () => {
    const { view, user } = await openFlow();
    const dialog = await stepOne();
    await user.click(await dialog.findByRole('radio', { name: NORDIC }));
    expect(dialog.getByRole('radio', { name: NORDIC })).toBeChecked();

    view.rerender(flow({ open: false }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    view.rerender(flow());
    const reopened = await stepOne();
    expect(await reopened.findByRole('radio', { name: NORDIC })).not.toBeChecked();
  });
});
