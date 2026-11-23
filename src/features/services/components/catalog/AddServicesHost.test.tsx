// Tests for the host of the Add services flow, with a stand-in dialog of the test's own: the address opens it (`add`, `from`) with the
// supplier and the way in, closing it clears both keys and keeps the rest, "A service of my own" hands over to the New service form,
// and a role that may not add services never gets it. They run with the real providers against the dev mock API.
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, useNavigationType } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import { mockMe, renderShell, setupMockApi, signInAs } from '@/test/renderApp';
import { AddServicesHost, type AddServicesDialogComponent } from './AddServicesHost';

setupMockApi();
vi.setConfig({ testTimeout: 20_000 });

/** A dialog that shows what the host gave it and has the three ways out the real one has. */
const StubDialog: AddServicesDialogComponent = ({ open, initial, onOwnService, onClose, onDone }) =>
  open ? (
    <div role="dialog" aria-label="Add services">
      <p>
        {initial ? `Supplier ${initial.supplierId}, way: ${initial.from ?? 'none'}` : 'No supplier chosen'}
      </p>
      <button type="button" onClick={onOwnService}>
        A service of my own
      </button>
      <button type="button" onClick={() => onDone?.()}>
        Finish
      </button>
      <button type="button" onClick={onClose}>
        Close
      </button>
    </div>
  ) : null;

/** Shows how the router got to the address (a replaced entry reads REPLACE) next to the host. */
function Page() {
  const type = useNavigationType();
  return (
    <>
      <AddServicesHost Dialog={StubDialog} />
      <p hidden data-testid="navigation">
        {type}
      </p>
    </>
  );
}

/** Signs in (as the Owner, or with fewer permissions) and mounts the host at an address of the Catalog page. */
async function openHost(route: string, options: { permissions?: string[] } = {}) {
  await signInAs();
  if (options.permissions) mockMe({ id: 1, name: 'Rami K.', permissions: options.permissions });
  const app = renderShell(route, <Route path="/catalog" element={<Page />} />);
  await screen.findByTestId('navigation');
  return app;
}

const flow = () => screen.queryByRole('dialog', { name: 'Add services' });

describe('what the address opens', () => {
  it('shows nothing at the bare address', async () => {
    await openHost('/catalog');
    expect(flow()).not.toBeInTheDocument();
  });

  it('opens the dialog with no supplier for add=new', async () => {
    await openHost('/catalog?add=new');
    expect(await screen.findByText('No supplier chosen')).toBeInTheDocument();
  });

  it('gives the dialog the supplier and the way in', async () => {
    await openHost('/catalog?add=4&from=groups');
    expect(await screen.findByText('Supplier 4, way: groups')).toBeInTheDocument();
  });

  it('gives the dialog the supplier alone when the address names no way', async () => {
    await openHost('/catalog?add=4');
    expect(await screen.findByText('Supplier 4, way: none')).toBeInTheDocument();
  });

  it('opens nothing for an add that is not a supplier id or "new"', async () => {
    const app = await openHost('/catalog?add=abc');
    expect(flow()).not.toBeInTheDocument();
    expect(app.location()).toBe('/catalog?add=abc');
  });
});

describe('closing', () => {
  it('clears add and from, keeps every other key, and replaces the history entry', async () => {
    const user = userEvent.setup();
    const app = await openHost('/catalog?q=unlock&add=4&from=services&open=7');
    await user.click(await screen.findByRole('button', { name: 'Close' }));
    await waitFor(() => expect(flow()).not.toBeInTheDocument());
    expect(app.location()).toBe('/catalog?q=unlock&open=7');
    expect(screen.getByTestId('navigation')).toHaveTextContent('REPLACE');
  });

  it('stays open when the flow reports that services were added: the result is for the person to read', async () => {
    const user = userEvent.setup();
    const app = await openHost('/catalog?add=4&from=groups');
    await user.click(await screen.findByRole('button', { name: 'Finish' }));
    expect(flow()).toBeInTheDocument();
    expect(app.location()).toBe('/catalog?add=4&from=groups');
  });
});

describe('A service of my own', () => {
  it('closes the flow, clears its keys and opens the New service form', async () => {
    const user = userEvent.setup();
    const app = await openHost('/catalog?q=unlock&add=new');
    await user.click(await screen.findByRole('button', { name: 'A service of my own' }));
    expect(await screen.findByRole('dialog', { name: 'New service' })).toBeInTheDocument();
    expect(flow()).not.toBeInTheDocument();
    expect(app.location()).toBe('/catalog?q=unlock');
  });

  it('leaves nothing open when the form is cancelled', async () => {
    const user = userEvent.setup();
    const app = await openHost('/catalog?add=new');
    await user.click(await screen.findByRole('button', { name: 'A service of my own' }));
    const form = await screen.findByRole('dialog', { name: 'New service' });
    await user.click(await screen.findByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(form).not.toBeInTheDocument());
    expect(flow()).not.toBeInTheDocument();
    expect(app.location()).toBe('/catalog');
  });
});

describe('a role that may not add services', () => {
  it('never gets the dialog, and the address is cleaned', async () => {
    const app = await openHost('/catalog?q=unlock&add=4&from=groups', { permissions: ['catalog:read'] });
    await waitFor(() => expect(app.location()).toBe('/catalog?q=unlock'));
    expect(flow()).not.toBeInTheDocument();
    expect(screen.queryByRole('dialog', { name: 'New service' })).not.toBeInTheDocument();
  });
});
