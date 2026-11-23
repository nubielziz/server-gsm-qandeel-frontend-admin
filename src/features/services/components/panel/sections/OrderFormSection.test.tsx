// Tests for OrderFormSection, the "Order form" part of the service panel. It is rendered inside the real app shell against the dev mock
// API, in a small route of its own, the way the panel would mount it: the summary of the fields and options, the two buttons that open
// the existing dialogs (and refresh the summary after a save), the permission hints, and the loading failure.
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http } from 'msw';
import { Route } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import { SidePanelSection } from '@/components/ui';
import { mockServer } from '@/mocks/node';
import { problem } from '@/mocks/problem';
import { mockMe, renderShell, setupMockApi, signInAs } from '@/test/renderApp';
import { getService } from '../../../api';
import { useServiceGrants } from '../../../hooks/useServiceGrants';
import type { Service } from '../../../types';
import { OrderFormSection } from './OrderFormSection';

setupMockApi();
vi.setConfig({ testTimeout: 20_000 });

// Services of the demo seed: 15 (Z3X credits) has one required text field and no options; 5 (the AT&T unlock) has two models, one
// network and no MEP entries and no fields; 1 has neither.
const WITH_FIELD = 15;
const WITH_OPTIONS = 5;
const WITH_NOTHING = 1;

/** The panel's stand-in: reads the grants the way the panel's host does and mounts the section in the panel's frame. */
function Host({ service, onDirtyChange }: { service: Service; onDirtyChange: (dirty: boolean) => void }) {
  const grants = useServiceGrants();
  return (
    <SidePanelSection id="service-panel-order-form" title="Order form">
      <OrderFormSection service={service} grants={grants} active={false} onDirtyChange={onDirtyChange} />
    </SidePanelSection>
  );
}

/** Signs in (as a staff member with only `permissions` when given) and reads the service row the table would pass in. */
async function loadService(id: number, permissions?: string[]) {
  await signInAs();
  if (permissions) mockMe({ id: 1, name: 'Rami K.', permissions });
  return getService(id);
}

function mount(service: Service, onDirtyChange: (dirty: boolean) => void = vi.fn()) {
  return renderShell(
    '/probe',
    <Route path="/probe" element={<Host service={service} onDirtyChange={onDirtyChange} />} />,
  );
}

/** The section: it is on screen at once, and fills in when the detail has loaded. */
async function section() {
  return within(await screen.findByRole('region', { name: 'Order form' }, { timeout: 10_000 }));
}

/** The line of one option list ("Models", "Networks", "MEP") in the options summary. */
function optionLine(name: string) {
  const line = within(screen.getByRole('list', { name: 'Option lists' }))
    .getByText(name)
    .closest('li');
  if (!line) throw new Error(`No line for the ${name} list.`);
  return line;
}

describe('the summary', () => {
  it('lists the order fields in order with their type and whether they are required, and says the options are empty', async () => {
    mount(await loadService(WITH_FIELD));
    const panel = await section();
    const fields = await panel.findByRole('list', { name: 'Order fields' });
    const lines = within(fields).getAllByRole('listitem');
    expect(lines).toHaveLength(1);
    expect(lines[0]).toHaveTextContent('Z3X account');
    expect(lines[0]).toHaveTextContent('Text');
    expect(lines[0]).toHaveTextContent('Required');
    expect(panel.getByText(/No option lists yet/)).toBeInTheDocument();
    expect(panel.queryByRole('list', { name: 'Option lists' })).not.toBeInTheDocument();
  });

  it('shows the entries of each option list, says None for an empty one, and says the fields are empty', async () => {
    mount(await loadService(WITH_OPTIONS));
    const panel = await section();
    expect(await panel.findByRole('list', { name: 'Option lists' })).toBeInTheDocument();
    expect(optionLine('Models')).toHaveTextContent('2 entries');
    expect(optionLine('Networks')).toHaveTextContent('1 entry');
    expect(optionLine('MEP')).toHaveTextContent('None');
    expect(panel.getByText(/No order fields yet/)).toBeInTheDocument();
    expect(panel.queryByRole('list', { name: 'Order fields' })).not.toBeInTheDocument();
  });

  it('shows both empty states for a service with no fields and no options', async () => {
    mount(await loadService(WITH_NOTHING));
    const panel = await section();
    expect(await panel.findByText(/No order fields yet/)).toBeInTheDocument();
    expect(panel.getByText(/No option lists yet/)).toBeInTheDocument();
  });

  it('shows the server’s words with Retry when the detail cannot be read, and the summary after it', async () => {
    const user = userEvent.setup();
    const service = await loadService(WITH_FIELD);
    mockServer.use(
      http.get('*/admin/services/:id', () =>
        problem(404, 'NOT_FOUND', 'Not found', 'The service is not available.'),
      ),
    );
    mount(service);
    expect(await screen.findByText('Could not load the order form')).toBeInTheDocument();
    expect(screen.getByText('The service is not available.')).toBeInTheDocument();
    mockServer.resetHandlers();
    await user.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByRole('list', { name: 'Order fields' })).toBeInTheDocument();
  });
});

describe('Edit fields…', () => {
  it('opens the Fields dialog on the saved fields, and the summary shows a field added in it', async () => {
    const user = userEvent.setup();
    const onDirtyChange = vi.fn();
    mount(await loadService(WITH_FIELD), onDirtyChange);
    const panel = await section();
    const button = await panel.findByRole('button', { name: 'Edit fields…' });
    await waitFor(() => expect(button).toBeEnabled());
    await user.click(button);
    const dialog = within(await screen.findByRole('dialog', { name: 'Fields' }));
    expect(await dialog.findByRole('textbox', { name: 'Key of field 1' })).toHaveValue('account');
    await user.click(dialog.getByRole('button', { name: 'Add a field' }));
    await user.type(dialog.getByRole('textbox', { name: 'Key of field 2' }), 'plan');
    await user.type(dialog.getByRole('textbox', { name: 'Label of field 2' }), 'Plan');
    await user.click(dialog.getByRole('button', { name: 'Save fields' }));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Fields' })).not.toBeInTheDocument());
    await waitFor(() =>
      expect(
        within(screen.getByRole('list', { name: 'Order fields' }))
          .getAllByRole('listitem')
          .map((line) => line.textContent),
      ).toEqual([expect.stringContaining('Z3X account'), expect.stringContaining('Plan')]),
    );
    expect((await getService(WITH_FIELD)).fields.map((field) => field.key)).toEqual(['account', 'plan']);
    expect(onDirtyChange).not.toHaveBeenCalled();
  });

  it('closes the dialog without saving when it is cancelled', async () => {
    const user = userEvent.setup();
    const onDirtyChange = vi.fn();
    mount(await loadService(WITH_FIELD), onDirtyChange);
    const button = await (await section()).findByRole('button', { name: 'Edit fields…' });
    await waitFor(() => expect(button).toBeEnabled());
    await user.click(button);
    const dialog = within(await screen.findByRole('dialog', { name: 'Fields' }));
    await dialog.findByRole('textbox', { name: 'Key of field 1' });
    await user.click(dialog.getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Fields' })).not.toBeInTheDocument());
    expect((await getService(WITH_FIELD)).fields).toHaveLength(1);
    expect(onDirtyChange).not.toHaveBeenCalled();
  });
});

describe('Edit options…', () => {
  it('opens the Options dialog on the saved lists, and the summary counts the entries added in it', async () => {
    const user = userEvent.setup();
    const onDirtyChange = vi.fn();
    mount(await loadService(WITH_OPTIONS), onDirtyChange);
    const panel = await section();
    const button = await panel.findByRole('button', { name: 'Edit options…' });
    await waitFor(() => expect(button).toBeEnabled());
    await user.click(button);
    const dialog = within(await screen.findByRole('dialog', { name: 'Options' }));
    expect(await dialog.findByRole('textbox', { name: 'Models' })).toHaveValue(
      'iphone15 | iPhone 15\niphone14 | iPhone 14',
    );
    await user.type(dialog.getByRole('textbox', { name: 'MEP' }), 'mep1 | MEP one');
    await user.click(dialog.getByRole('button', { name: 'Save options' }));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Options' })).not.toBeInTheDocument());
    await waitFor(() => expect(optionLine('MEP')).toHaveTextContent('1 entry'));
    expect(optionLine('Models')).toHaveTextContent('2 entries');
    expect(onDirtyChange).not.toHaveBeenCalled();
  });
});

describe('permissions', () => {
  it('turns both buttons off, naming catalog:update, for a staff member who may only read', async () => {
    mount(await loadService(WITH_FIELD, ['catalog:read']));
    const panel = await section();
    await panel.findByRole('list', { name: 'Order fields' });
    for (const name of ['Edit fields…', 'Edit options…']) {
      const button = panel.getByRole('button', { name });
      expect(button).toBeDisabled();
      expect(button).toHaveAttribute('title', 'You need the catalog:update permission');
    }
  });

  it('leaves both buttons on for a staff member who may update the catalog', async () => {
    mount(await loadService(WITH_FIELD, ['catalog:read', 'catalog:update']));
    const panel = await section();
    await panel.findByRole('list', { name: 'Order fields' });
    for (const name of ['Edit fields…', 'Edit options…']) {
      const button = panel.getByRole('button', { name });
      await waitFor(() => expect(button).toBeEnabled());
      expect(button).not.toHaveAttribute('title');
    }
  });
});
