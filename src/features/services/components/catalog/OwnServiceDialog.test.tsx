// Tests for "A service of my own": the New service form as the Add services flow's own path. Saving it makes the service and moves the
// address to its panel (`/catalog?open=<id>`), or tells the page the new id when the page moves itself (the page asks about unsaved
// changes in the open panel first); cancelling it changes nothing. They run with the real providers against the dev mock API.
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { Route } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import { renderShell, setupMockApi, signInAs } from '@/test/renderApp';
import { listServices } from '../../api';
import { OwnServiceDialog } from './OwnServiceDialog';

setupMockApi();
vi.setConfig({ testTimeout: 20_000 });

/** A button that opens the form, as the host does, and a line that says whether it is open. */
function Opener({ onCreated }: { onCreated?: (id: number) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Open the form
      </button>
      <p>{open ? 'The form is open' : 'The form is closed'}</p>
      {open && <OwnServiceDialog onClose={() => setOpen(false)} onCreated={onCreated} />}
    </>
  );
}

async function openForm(user: ReturnType<typeof userEvent.setup>, onCreated?: (id: number) => void) {
  await signInAs();
  const app = renderShell(
    '/catalog?q=unlock',
    <Route path="/catalog" element={<Opener onCreated={onCreated} />} />,
  );
  await user.click(await screen.findByRole('button', { name: 'Open the form' }));
  return { app, dialog: within(await screen.findByRole('dialog', { name: 'New service' })) };
}

describe('the New service form of the flow', () => {
  it('creates the service and moves the address to its panel, dropping the table filters', async () => {
    const user = userEvent.setup();
    const { app, dialog } = await openForm(user);
    await dialog.findByRole('option', { name: 'Apple' });
    await user.type(dialog.getByRole('textbox', { name: 'Name' }), 'Own Unlock');
    await user.type(dialog.getByRole('textbox', { name: 'Code' }), 'IMEI-OWN-1');
    await user.selectOptions(dialog.getByRole('combobox', { name: 'Category' }), 'Apple');
    await user.type(dialog.getByRole('textbox', { name: 'Base price (USD)' }), '3');
    await user.click(dialog.getByRole('button', { name: 'Create service' }));

    const [created] = (await listServices({ q: 'IMEI-OWN-1' })).data;
    expect(created).toMatchObject({ name: 'Own Unlock', code: 'IMEI-OWN-1' });
    await waitFor(() => expect(app.location()).toBe(`/catalog?open=${created.id}`));
    await waitFor(() => expect(screen.getByText('The form is closed')).toBeInTheDocument());
  });

  it('tells the page the new id, and leaves the address to it, when the page gave a way to say so', async () => {
    const user = userEvent.setup();
    const onCreated = vi.fn();
    const { app, dialog } = await openForm(user, onCreated);
    await dialog.findByRole('option', { name: 'Apple' });
    await user.type(dialog.getByRole('textbox', { name: 'Name' }), 'Own Unlock Two');
    await user.type(dialog.getByRole('textbox', { name: 'Code' }), 'IMEI-OWN-2');
    await user.selectOptions(dialog.getByRole('combobox', { name: 'Category' }), 'Apple');
    await user.type(dialog.getByRole('textbox', { name: 'Base price (USD)' }), '3');
    await user.click(dialog.getByRole('button', { name: 'Create service' }));

    const [created] = (await listServices({ q: 'IMEI-OWN-2' })).data;
    await waitFor(() => expect(onCreated).toHaveBeenCalledWith(created.id));
    expect(onCreated).toHaveBeenCalledTimes(1);
    expect(app.location()).toBe('/catalog?q=unlock');
  });

  it('keeps the address and closes when it is cancelled', async () => {
    const user = userEvent.setup();
    const { app, dialog } = await openForm(user);
    await user.click(dialog.getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.getByText('The form is closed')).toBeInTheDocument());
    expect(app.location()).toBe('/catalog?q=unlock');
  });

  it('stays open, on the same address, when the server refuses the service', async () => {
    const user = userEvent.setup();
    const { app, dialog } = await openForm(user);
    await dialog.findByRole('option', { name: 'Apple' });
    await user.type(dialog.getByRole('textbox', { name: 'Name' }), 'Another AT&T');
    await user.type(dialog.getByRole('textbox', { name: 'Code' }), 'IMEI-ATT-USA');
    await user.selectOptions(dialog.getByRole('combobox', { name: 'Category' }), 'Apple');
    await user.type(dialog.getByRole('textbox', { name: 'Base price (USD)' }), '9');
    await user.click(dialog.getByRole('button', { name: 'Create service' }));
    expect(
      await dialog.findByText('The code IMEI-ATT-USA is already used by AT&T USA Premier Unlock.'),
    ).toBeInTheDocument();
    expect(screen.getByText('The form is open')).toBeInTheDocument();
    expect(app.location()).toBe('/catalog?q=unlock');
  });
});
