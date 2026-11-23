// Tests for the New/Edit service dialog mounted on its own beside a stand-in host: what it hands back after a save (`onSaved`),
// and "New category…" inside the dialog (Enter belongs to the step, not to the dialog's form). They run against the dev mock API.
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { Route } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderShell, setupMockApi, signInAs } from '@/test/renderApp';
import { getService, listServices } from '../api';
import { recordRequests } from '../test/requests';
import type { Service } from '../types';
import { ServiceFormDialog } from './ServiceFormDialog';

setupMockApi();
vi.setConfig({ testTimeout: 20_000 });
afterEach(() => vi.restoreAllMocks());

const EE_UK = 9; // "EE UK Unlock"

/** The page's stand-in: a button that opens the dialog (to edit `service` when given) and a line that says what the dialog handed back. */
function Host({ service }: { service?: Service }) {
  const [open, setOpen] = useState(false);
  const [saved, setSaved] = useState('Nothing saved');
  return (
    <>
      <button onClick={() => setOpen(true)}>Open the form</button>
      <p>{saved}</p>
      {open && (
        <ServiceFormDialog
          service={service}
          onClose={() => setOpen(false)}
          onSaved={(result) => setSaved(`Saved ${result.name} with SLA ${result.slaMinutes}`)}
        />
      )}
    </>
  );
}

async function openForm(service?: Service) {
  renderShell('/probe', <Route path="/probe" element={<Host service={service} />} />);
  const user = userEvent.setup();
  await user.click(await screen.findByRole('button', { name: 'Open the form' }));
  const dialog = within(
    await screen.findByRole('dialog', { name: service ? 'Edit service' : 'New service' }),
  );
  await dialog.findByRole('option', { name: 'Apple' });
  return { user, dialog };
}

describe('onSaved', () => {
  it('hands back the service the server made, as the dialog closes', async () => {
    await signInAs();
    const { user, dialog } = await openForm();
    await user.type(dialog.getByRole('textbox', { name: 'Name' }), 'Host Check');
    await user.type(dialog.getByRole('textbox', { name: 'Code' }), 'HOST-1');
    await user.selectOptions(dialog.getByRole('combobox', { name: 'Category' }), 'Apple');
    await user.clear(dialog.getByRole('textbox', { name: 'SLA (minutes)' }));
    await user.type(dialog.getByRole('textbox', { name: 'SLA (minutes)' }), '20');
    await user.type(dialog.getByRole('textbox', { name: 'Base price (USD)' }), '3');
    await user.click(dialog.getByRole('button', { name: 'Create service' }));
    expect(await screen.findByText('Saved Host Check with SLA 20')).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: 'New service' })).not.toBeInTheDocument(),
    );
    expect((await listServices({ q: 'HOST-1' })).data).toHaveLength(1);
  });

  it('hands back the service an edit changed', async () => {
    await signInAs();
    const service = await getService(EE_UK);
    const { user, dialog } = await openForm(service);
    const sla = dialog.getByRole('textbox', { name: 'SLA (minutes)' });
    await user.clear(sla);
    await user.type(sla, '90');
    await user.click(dialog.getByRole('button', { name: 'Save changes' }));
    expect(await screen.findByText('Saved EE UK Unlock with SLA 90')).toBeInTheDocument();
    expect((await getService(EE_UK)).slaMinutes).toBe(90);
  });

  it('hands back nothing for an edit that changed nothing', async () => {
    await signInAs();
    const service = await getService(EE_UK);
    const { user, dialog } = await openForm(service);
    await user.click(dialog.getByRole('button', { name: 'Save changes' }));
    expect(await screen.findByText('Nothing changed')).toBeInTheDocument();
    expect(screen.getByText('Nothing saved')).toBeInTheDocument();
  });
});

describe('New category…', () => {
  it('makes the category from the dialog, selects it, and keeps Enter from saving the service', async () => {
    await signInAs();
    const { user, dialog } = await openForm();
    const requests = recordRequests();
    await user.type(dialog.getByRole('textbox', { name: 'Name' }), 'Fresh Service');
    await user.type(dialog.getByRole('textbox', { name: 'Code' }), 'FRESH-1');
    await user.selectOptions(dialog.getByRole('combobox', { name: 'Type' }), 'File');
    await user.type(dialog.getByRole('textbox', { name: 'Base price (USD)' }), '4');
    await user.click(dialog.getByRole('button', { name: 'New category…' }));
    const step = within(dialog.getByRole('group', { name: 'New category' }));
    await user.type(step.getByRole('textbox', { name: 'Category name' }), 'Fresh files{Enter}');

    expect(await dialog.findByRole('option', { name: 'Fresh files' })).toBeInTheDocument();
    expect(dialog.getByRole('combobox', { name: 'Category' })).toHaveDisplayValue('Fresh files');
    expect(screen.getByRole('dialog', { name: 'New service' })).toBeInTheDocument();
    const sent = requests.sent().filter((request) => request.method === 'POST');
    expect(sent.map((request) => request.url.pathname.split('/').slice(-1)[0])).toEqual([
      'service-categories',
    ]);
    expect(sent[0].body).toMatchObject({ name: 'Fresh files', type: 'file' });

    await user.click(dialog.getByRole('button', { name: 'Create service' }));
    expect(await screen.findByText(/^Saved Fresh Service/)).toBeInTheDocument();
    const [created] = (await listServices({ q: 'FRESH-1' })).data;
    expect(created.category?.name).toBe('Fresh files');
    expect(created.type).toBe('file');
  });
});
