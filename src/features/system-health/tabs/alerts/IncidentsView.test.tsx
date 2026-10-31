// Tests for the Incidents view, run through the whole app against the dev mock API: the list, the drawer (`?incident=`),
// Post update, Close incident (the root cause is required) and Declare incident.
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import { mockServer } from '@/mocks/node';
import { problem } from '@/mocks/problem';
import { setupHealthMocks } from '../../mocks/testing';
import { openHealthPage, type OpenHealthOptions } from '../../test/openHealthPage';
import { SLOW } from '../../test/pageQueries';
import { recordRequests } from '../../test/recordRequests';

setupHealthMocks();
// The page is a lazy chunk and every flow goes through the mock API, so give the first test of a file room.
vi.setConfig({ testTimeout: 30_000 });

const LIST = '/system-health?tab=alerts&view=incidents';

/** Opens the Incidents view and waits for its card. */
async function openIncidents(options: OpenHealthOptions = {}) {
  const app = await openHealthPage({ route: LIST, ...options });
  await screen.findByRole('heading', { level: 2, name: 'Incidents' }, SLOW);
  return app;
}

/** The incidents table, once the list has rows. */
const incidentsTable = async () => within(await screen.findByRole('table', { name: 'Incidents' }, SLOW));

/** The drawer of an incident, by its title. */
const drawerOf = async (title: string) => within(await screen.findByRole('dialog', { name: title }, SLOW));

function rowOf(table: ReturnType<typeof within>, text: string) {
  const row = table.getByText(text).closest('tr');
  if (!row) throw new Error(`No row holds "${text}".`);
  return within(row);
}

describe('the list', () => {
  it('lists the ongoing incident of a degraded platform, and hides resolved ones behind a quiet line', async () => {
    const user = userEvent.setup();
    const app = await openIncidents({ scenario: 'degraded' });
    const table = await incidentsTable();
    expect(table.getAllByRole('row').slice(1)).toHaveLength(1);
    const row = rowOf(table, 'Supplier timeouts');
    expect(row.getByText('Major')).toBeInTheDocument();
    expect(row.getByText('Identified')).toBeInTheDocument();
    // The component is named from the health summary; the duration says it has not ended.
    expect(await row.findByText('Rapid IMEI', undefined, SLOW)).toBeInTheDocument();
    expect(row.getByText(/^\d+m ago$/)).toBeInTheDocument();
    expect(row.getByText('so far')).toBeInTheDocument();
    expect(screen.getByText(/Resolved incidents are hidden/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Show resolved incidents' }));
    await waitFor(() => expect(app.location()).toBe(`${LIST}&status=all`));
    await waitFor(() => expect(table.getAllByRole('row').slice(1)).toHaveLength(5), SLOW);
    const closed = rowOf(table, 'Storefront checkout errors');
    expect(closed.getByText('Resolved')).toBeInTheDocument();
    expect(closed.getByText('26m')).toBeInTheDocument();
    expect(closed.queryByText('so far')).not.toBeInTheDocument();
  });

  it('says so when nothing is ongoing, and lists the resolved ones on request', async () => {
    const user = userEvent.setup();
    await openIncidents({ scenario: 'healthy' });
    expect(await screen.findByRole('heading', { name: 'No ongoing incidents' }, SLOW)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Resolved' }));
    const table = await incidentsTable();
    await waitFor(() => expect(table.getAllByRole('row').slice(1)).toHaveLength(4), SLOW);
    expect(table.queryByText('Identified')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Resolved' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('names every affected component of a platform outage', async () => {
    await openIncidents({ scenario: 'outage' });
    const row = rowOf(await incidentsTable(), 'Database not accepting connections');
    expect(row.getByText('Critical')).toBeInTheDocument();
    expect(await row.findByText('Postgres, API, Queue workers', undefined, SLOW)).toBeInTheDocument();
  });

  it('prints component keys in mono when the role cannot read the health summary that names them', async () => {
    await openIncidents({ scenario: 'degraded', permissions: ['incidents:read'] });
    const row = rowOf(await incidentsTable(), 'Supplier timeouts');
    expect(row.getByText('supplier:3')).toHaveClass('mono');
    expect(row.queryByText('Rapid IMEI')).not.toBeInTheDocument();
  });

  it('shows the server error with Retry when the read fails, and keeps the filter and Declare', async () => {
    mockServer.use(
      http.get('*/admin/incidents', () =>
        problem(500, 'INTERNAL_ERROR', 'Something went wrong', 'The incident log did not answer.'),
      ),
    );
    await openIncidents();
    expect(await screen.findByText('Could not load the incidents', undefined, SLOW)).toBeInTheDocument();
    expect(screen.getByText('The incident log did not answer.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Incident status' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Declare incident' })).toBeInTheDocument();
  });
});

describe('the drawer', () => {
  it('opens for ?incident= with the summary, the facts and the timeline, and a footer of actions', async () => {
    await openHealthPage({ scenario: 'degraded', route: `${LIST}&incident=5` });
    const drawer = await drawerOf('Supplier timeouts');
    expect(drawer.getByText('Incident #5')).toBeInTheDocument();
    expect(drawer.getByText('Major')).toBeInTheDocument();
    // The status is the badge of the drawer and the word of the latest timeline line.
    expect(drawer.getAllByText('Identified')).toHaveLength(2);
    expect(drawer.getByText(/Rapid IMEI answers in about 6 seconds and times out/)).toBeInTheDocument();
    expect(drawer.getByText('Declared by')).toBeInTheDocument();
    expect(await drawer.findByText('Rapid IMEI', { selector: 'dd *' }, SLOW)).toBeInTheDocument();
    // The timeline: oldest first, each line with its status word, its text and who wrote it.
    const lines = drawer.getAllByRole('listitem');
    expect(lines).toHaveLength(2);
    expect(within(lines[0]).getByText('Investigating')).toBeInTheDocument();
    expect(within(lines[0]).getByText(/Timeouts on Rapid IMEI/)).toBeInTheDocument();
    expect(within(lines[1]).getByText('Identified')).toBeInTheDocument();
    expect(within(lines[1]).getByText(/The supplier confirmed a problem on its side/)).toBeInTheDocument();
    expect(within(lines[1]).getByText('Dana M.')).toBeInTheDocument();
    expect(drawer.getByRole('button', { name: 'Post update' })).toBeInTheDocument();
    expect(drawer.getByRole('button', { name: 'Close incident' })).toBeInTheDocument();
  });

  it('shows a resolved incident as a record: the root cause, and no actions', async () => {
    await openHealthPage({ scenario: 'degraded', route: `${LIST}&status=all&incident=1` });
    const drawer = await drawerOf('Storefront checkout errors');
    expect(drawer.getByText('Root cause')).toBeInTheDocument();
    expect(drawer.getByText(/The gateway renamed the signature header without notice/)).toBeInTheDocument();
    expect(drawer.getByText('Resolved', { selector: 'dt' })).toBeInTheDocument();
    expect(drawer.getByText(/by Rami K\.$/, { selector: 'dd' })).toBeInTheDocument();
    expect(drawer.getAllByRole('listitem')).toHaveLength(4);
    expect(drawer.queryByRole('button', { name: 'Post update' })).not.toBeInTheDocument();
    expect(drawer.queryByRole('button', { name: 'Close incident' })).not.toBeInTheDocument();
  });

  it('says so for an incident that does not exist', async () => {
    await openHealthPage({ scenario: 'degraded', route: `${LIST}&incident=999` });
    expect(await screen.findByRole('heading', { name: 'Incident not found' }, SLOW)).toBeInTheDocument();
  });

  it('opens from the title in the list, keeps it in the address, and the close button takes it out again', async () => {
    const user = userEvent.setup();
    const app = await openIncidents({ scenario: 'degraded' });
    const table = await incidentsTable();
    await user.click(table.getByRole('button', { name: 'Supplier timeouts' }));
    await waitFor(() => expect(app.location()).toBe(`${LIST}&incident=5`));
    const drawer = await drawerOf('Supplier timeouts');
    await user.click(drawer.getByRole('button', { name: 'Close details' }));
    await waitFor(() => expect(app.location()).toBe(LIST));
    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: 'Supplier timeouts' })).not.toBeInTheDocument(),
    );
  });

  it('shows the permission it needs when the server refuses the read', async () => {
    mockServer.use(
      http.get('*/admin/incidents/:id', () =>
        problem(403, 'FORBIDDEN', 'Forbidden', 'You need the incidents:read permission.'),
      ),
    );
    await openHealthPage({ scenario: 'degraded', route: `${LIST}&incident=5` });
    expect(
      await screen.findByRole('heading', { name: 'You need the incidents:read permission' }, SLOW),
    ).toBeInTheDocument();
  });
});

describe('Post update', () => {
  async function openUpdate() {
    const user = userEvent.setup();
    await openHealthPage({ scenario: 'degraded', route: `${LIST}&incident=5` });
    const drawer = await drawerOf('Supplier timeouts');
    await user.click(drawer.getByRole('button', { name: 'Post update' }));
    const dialog = within(await screen.findByRole('dialog', { name: 'Post update' }));
    return { user, drawer, dialog };
  }

  it('starts on the incident status, leaves out resolved, and states the effect', async () => {
    const { dialog } = await openUpdate();
    expect(dialog.getByLabelText('Status')).toHaveValue('identified');
    expect(dialog.getAllByRole('option').map((option) => option.textContent)).toEqual([
      'Investigating',
      'Identified',
      'Monitoring',
    ]);
    expect(dialog.getByRole('note')).toHaveTextContent(
      'Adds a line to the timeline with your name and the time.',
    );
  });

  it('asks for the text before it sends anything', async () => {
    const writes = recordRequests('patch', '/admin/incidents/:id');
    const { user, dialog } = await openUpdate();
    await user.click(dialog.getByRole('button', { name: 'Post update' }));
    expect(await dialog.findByText('Write what changed.')).toBeInTheDocument();
    expect(writes).toHaveLength(0);
  });

  it('sends the status and the text, toasts, and the timeline shows the new line', async () => {
    const writes = recordRequests('patch', '/admin/incidents/:id');
    const { user, drawer, dialog } = await openUpdate();
    await user.selectOptions(dialog.getByLabelText('Status'), 'monitoring');
    await user.type(dialog.getByLabelText('Update'), '  Supplier is answering again; watching.  ');
    await user.click(dialog.getByRole('button', { name: 'Post update' }));

    await waitFor(() => expect(writes).toHaveLength(1), SLOW);
    expect(writes[0].body).toEqual({
      status: 'monitoring',
      update: 'Supplier is answering again; watching.',
    });
    expect(await screen.findByText('Update posted')).toBeInTheDocument();
    await waitFor(() => expect(drawer.getAllByRole('listitem')).toHaveLength(3), SLOW);
    const last = drawer.getAllByRole('listitem')[2];
    expect(within(last).getByText('Monitoring')).toBeInTheDocument();
    expect(within(last).getByText(/Supplier is answering again; watching\./)).toBeInTheDocument();
    expect(within(last).getByText('Rami K.')).toBeInTheDocument();
    // The status badge of the drawer follows.
    expect(drawer.getAllByText('Monitoring').length).toBeGreaterThan(1);
  });

  it("puts the server's message about a long update under the field", async () => {
    const { user, dialog } = await openUpdate();
    await user.click(dialog.getByLabelText('Update'));
    await user.paste('x'.repeat(1001));
    await user.click(dialog.getByRole('button', { name: 'Post update' }));
    const field = dialog.getByLabelText('Update');
    await waitFor(() => expect(field).toHaveAttribute('aria-invalid', 'true'), SLOW);
    expect(dialog.getByText('Keep the update under 1000 characters.')).toBeInTheDocument();
  });
});

describe('Close incident', () => {
  async function openClose() {
    const user = userEvent.setup();
    const app = await openHealthPage({ scenario: 'degraded', route: `${LIST}&incident=5` });
    const drawer = await drawerOf('Supplier timeouts');
    await user.click(drawer.getByRole('button', { name: 'Close incident' }));
    const dialog = within(await screen.findByRole('dialog', { name: 'Close incident' }));
    return { user, app, drawer, dialog };
  }

  it('states the effect before the confirm button', async () => {
    const { dialog } = await openClose();
    expect(dialog.getByRole('note')).toHaveTextContent(
      'A closed incident is a record and cannot be changed.',
    );
    expect(dialog.getByLabelText('Root cause')).toHaveValue('');
    expect(dialog.getByLabelText('Action taken (optional)')).toHaveValue('');
  });

  it('asks for a root cause before it sends anything, as Declare and Post update ask for theirs', async () => {
    const writes = recordRequests('patch', '/admin/incidents/:id');
    const { user, dialog } = await openClose();
    await user.click(dialog.getByRole('button', { name: 'Close incident' }));
    expect(await dialog.findByText('Enter the root cause.')).toBeInTheDocument();
    expect(dialog.getByLabelText('Root cause')).toHaveAttribute('aria-invalid', 'true');
    // Only spaces is nothing: it is refused here too.
    await user.type(dialog.getByLabelText('Root cause'), '   ');
    await user.click(dialog.getByRole('button', { name: 'Close incident' }));
    expect(await dialog.findByText('Enter the root cause.')).toBeInTheDocument();
    expect(writes).toHaveLength(0);
    expect(screen.getByRole('dialog', { name: 'Close incident' })).toBeInTheDocument();
  });

  it('leaves the minimum length to the server: its 422 shows under the field and the dialog stays open', async () => {
    const writes = recordRequests('patch', '/admin/incidents/:id');
    const { user, dialog } = await openClose();
    const field = dialog.getByLabelText('Root cause');
    await user.type(field, 'Too short');
    await user.click(dialog.getByRole('button', { name: 'Close incident' }));
    await waitFor(() => expect(writes).toHaveLength(1), SLOW);
    expect(writes[0].body).toEqual({ status: 'resolved', rootCause: 'Too short' });
    expect(
      await dialog.findByText('Enter the root cause (at least 10 characters) to close the incident.'),
    ).toBeInTheDocument();
    expect(field).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByRole('dialog', { name: 'Close incident' })).toBeInTheDocument();
  });

  it('sends the root cause and the action taken, toasts, and the incident becomes a closed record', async () => {
    const writes = recordRequests('patch', '/admin/incidents/:id');
    const { user, drawer, dialog } = await openClose();
    await user.type(
      dialog.getByLabelText('Root cause'),
      '  The supplier lowered its limit without telling us.  ',
    );
    await user.type(
      dialog.getByLabelText('Action taken (optional)'),
      'We moved orders to the next supplier.',
    );
    await user.click(dialog.getByRole('button', { name: 'Close incident' }));

    await waitFor(() => expect(writes).toHaveLength(1), SLOW);
    expect(writes[0].body).toEqual({
      status: 'resolved',
      rootCause: 'The supplier lowered its limit without telling us.',
      update: 'We moved orders to the next supplier.',
    });
    expect(await screen.findByText('Incident closed')).toBeInTheDocument();
    await waitFor(() => expect(drawer.getByText('Root cause')).toBeInTheDocument(), SLOW);
    expect(drawer.getByText('The supplier lowered its limit without telling us.')).toBeInTheDocument();
    expect(drawer.queryByRole('button', { name: 'Post update' })).not.toBeInTheDocument();
    expect(drawer.queryByRole('button', { name: 'Close incident' })).not.toBeInTheDocument();
    expect(
      within(drawer.getAllByRole('listitem').at(-1)!).getByText(/We moved orders to the next supplier\./),
    ).toBeInTheDocument();
  });

  it('sends no action when the field is empty', async () => {
    const writes = recordRequests('patch', '/admin/incidents/:id');
    const { user, dialog } = await openClose();
    await user.type(dialog.getByLabelText('Root cause'), 'The supplier had an outage.');
    await user.click(dialog.getByRole('button', { name: 'Close incident' }));
    await waitFor(() => expect(writes).toHaveLength(1), SLOW);
    expect(writes[0].body).toEqual({ status: 'resolved', rootCause: 'The supplier had an outage.' });
  });

  it('removes the incident from the ongoing list once it is closed', async () => {
    const { user, app, dialog } = await openClose();
    await user.type(dialog.getByLabelText('Root cause'), 'The supplier had an outage.');
    await user.click(dialog.getByRole('button', { name: 'Close incident' }));
    await screen.findByText('Incident closed');
    const drawer = await drawerOf('Supplier timeouts');
    await user.click(drawer.getByRole('button', { name: 'Close details' }));
    await waitFor(() => expect(app.location()).toBe(LIST));
    expect(await screen.findByRole('heading', { name: 'No ongoing incidents' }, SLOW)).toBeInTheDocument();
  });
});

describe('Declare incident', () => {
  async function openDeclare(options: OpenHealthOptions = {}) {
    const user = userEvent.setup();
    await openIncidents({ scenario: 'degraded', ...options });
    await user.click(screen.getByRole('button', { name: 'Declare incident' }));
    const dialog = within(await screen.findByRole('dialog', { name: 'Declare incident' }));
    return { user, dialog };
  }

  it('starts blank, lists the platform components by name, and states the effect', async () => {
    const { dialog } = await openDeclare();
    expect(dialog.getByLabelText('Title')).toHaveValue('');
    expect(dialog.getByLabelText('Severity')).toHaveValue('major');
    expect(dialog.getByLabelText('Summary')).toHaveValue('');
    expect(await dialog.findByRole('checkbox', { name: 'Postgres' }, SLOW)).not.toBeChecked();
    // The component that is down comes first, with its status word.
    const first = dialog.getAllByRole('checkbox')[0];
    expect(first).toHaveAccessibleName('Rapid IMEI · Down');
    expect(first).not.toBeChecked();
    expect(dialog.getByRole('note')).toHaveTextContent('The incident starts at Investigating');
    expect(dialog.queryByText(/^From alert/)).not.toBeInTheDocument();
  });

  it('sends the incident without an alert, toasts, and the new incident heads the list', async () => {
    const writes = recordRequests('post', '/admin/incidents');
    const { user, dialog } = await openDeclare();
    await user.type(dialog.getByLabelText('Title'), '  Card payments failing  ');
    await user.selectOptions(dialog.getByLabelText('Severity'), 'critical');
    await user.click(await dialog.findByRole('checkbox', { name: 'Card gateway' }, SLOW));
    await user.click(dialog.getByRole('checkbox', { name: 'API' }));
    await user.type(dialog.getByLabelText('Summary'), 'Payments fail at the last step.');
    await user.click(dialog.getByRole('button', { name: 'Declare incident' }));

    await waitFor(() => expect(writes).toHaveLength(1), SLOW);
    expect(writes[0].body).toEqual({
      title: 'Card payments failing',
      severity: 'critical',
      components: ['api', 'gateway:1'],
      summary: 'Payments fail at the last step.',
    });
    expect(await screen.findByText('Incident declared')).toBeInTheDocument();
    const table = await incidentsTable();
    await waitFor(() => expect(table.getByText('Card payments failing')).toBeInTheDocument(), SLOW);
    expect(rowOf(table, 'Card payments failing').getByText('Investigating')).toBeInTheDocument();
  });

  it('asks for what is missing before it sends anything', async () => {
    const writes = recordRequests('post', '/admin/incidents');
    const { user, dialog } = await openDeclare();
    await dialog.findByRole('checkbox', { name: 'Postgres' }, SLOW);
    await user.click(dialog.getByRole('button', { name: 'Declare incident' }));
    expect(await dialog.findByText('Enter a title.')).toBeInTheDocument();
    expect(dialog.getByText('Choose at least one affected component.')).toBeInTheDocument();
    expect(dialog.getByText('Describe what is happening.')).toBeInTheDocument();
    expect(writes).toHaveLength(0);
  });

  it("puts the server's message about the title under it", async () => {
    const { user, dialog } = await openDeclare();
    await user.type(dialog.getByLabelText('Title'), 'ab');
    await user.click(await dialog.findByRole('checkbox', { name: 'Postgres' }, SLOW));
    await user.type(dialog.getByLabelText('Summary'), 'Postgres is slow.');
    await user.click(dialog.getByRole('button', { name: 'Declare incident' }));
    const title = dialog.getByLabelText('Title');
    await waitFor(() => expect(title).toHaveAttribute('aria-invalid', 'true'), SLOW);
    expect(dialog.getByText('Enter a title of 3 to 120 characters.')).toBeInTheDocument();
  });

  it('asks for component keys by typing when the role cannot read the list of components', async () => {
    const writes = recordRequests('post', '/admin/incidents');
    const { user, dialog } = await openDeclare({ permissions: ['incidents:read', 'incidents:create'] });
    const keys = await dialog.findByLabelText('Affected components', undefined, SLOW);
    expect(dialog.getByText(/The list of components could not be loaded/)).toBeInTheDocument();
    await user.type(dialog.getByLabelText('Title'), 'Supplier timeouts again');
    await user.type(keys, 'api, supplier:3');
    await user.type(dialog.getByLabelText('Summary'), 'Orders to the supplier time out.');
    await user.click(dialog.getByRole('button', { name: 'Declare incident' }));
    await waitFor(() => expect(writes).toHaveLength(1), SLOW);
    expect(writes[0].body).toMatchObject({ components: ['api', 'supplier:3'] });
  });
});

describe('who may act', () => {
  const readers = ['system:read', 'alerts:read', 'incidents:read'];

  it('shows no Declare button and no drawer actions to a staff member who can only read', async () => {
    await openHealthPage({ scenario: 'degraded', permissions: readers, route: `${LIST}&incident=5` });
    const drawer = await drawerOf('Supplier timeouts');
    expect(drawer.getByText(/Rapid IMEI answers in about 6 seconds/)).toBeInTheDocument();
    expect(drawer.queryByRole('button', { name: 'Post update' })).not.toBeInTheDocument();
    expect(drawer.queryByRole('button', { name: 'Close incident' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Declare incident' })).not.toBeInTheDocument();
  });

  it('shows none in the read-only scenario either', async () => {
    await openHealthPage({ scenario: 'readonly', route: `${LIST}&incident=5` });
    const drawer = await drawerOf('Supplier timeouts');
    expect(drawer.queryByRole('button', { name: 'Post update' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Declare incident' })).not.toBeInTheDocument();
  });

  it('disables the actions whose permission is missing, and says which one', async () => {
    await openHealthPage({
      scenario: 'degraded',
      permissions: [...readers, 'alerts:update'],
      route: `${LIST}&incident=5`,
    });
    const drawer = await drawerOf('Supplier timeouts');
    for (const name of ['Post update', 'Close incident']) {
      const button = drawer.getByRole('button', { name });
      expect(button).toBeDisabled();
      expect(button).toHaveAttribute('title', 'You need the incidents:update permission');
    }
    const declare = screen.getByRole('button', { name: 'Declare incident' });
    expect(declare).toBeDisabled();
    expect(declare).toHaveAttribute('title', 'You need the incidents:create permission');
  });
});
