// Tests for the Alerts view, run through the whole app against the dev mock API: what each scenario shows, the status
// filter, a read-only staff member, Acknowledge (with its note) and Declare incident from an alert.
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

/** Opens the Alerts view and waits for its table (or for the empty state when the list has no rows). */
async function openAlerts(options: OpenHealthOptions = {}) {
  const app = await openHealthPage({ route: '/system-health?tab=alerts', ...options });
  await screen.findByRole('heading', { level: 2, name: 'Alerts' }, SLOW);
  return app;
}

const alertsTable = async () => within(await screen.findByRole('table', { name: 'Alerts' }, SLOW));

// Who acknowledged an alert is written twice in the page and CSS shows one: under the status badge below 2xl, in the
// "Acknowledged by" column from there up. jsdom applies no CSS, so a test sees both.
const TWICE = 2;

/** The table row that holds some text (a rule name). */
function rowOf(table: ReturnType<typeof within>, text: string) {
  const row = table.getByText(text).closest('tr');
  if (!row) throw new Error(`No row holds "${text}".`);
  return within(row);
}

describe('what the view shows', () => {
  it('is quiet when nothing is open: a plain empty state, and resolved alerts one click away', async () => {
    const user = userEvent.setup();
    const app = await openAlerts({ scenario: 'healthy' });
    expect(await screen.findByRole('heading', { name: 'No open alerts' }, SLOW)).toBeInTheDocument();
    expect(screen.getByText(/Resolved alerts are hidden/)).toBeInTheDocument();
    expect(screen.queryByRole('note')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Show resolved alerts' }));
    await waitFor(() => expect(app.location()).toBe('/system-health?tab=alerts&status=all'));
    const table = await alertsTable();
    expect(table.getAllByRole('row').length).toBeGreaterThan(5);
    expect(table.getAllByText('Resolved').length).toBeGreaterThan(5);
    expect(screen.getByRole('button', { name: 'All' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('lists the open alerts of a degraded platform, firing first, with the condition as text', async () => {
    await openAlerts({ scenario: 'degraded' });
    const table = await alertsTable();
    const rows = table.getAllByRole('row').slice(1);
    expect(rows).toHaveLength(2);

    const timeouts = rowOf(table, 'Supplier timeouts');
    expect(timeouts.getByText('supplier_timeout_rate')).toBeInTheDocument();
    expect(timeouts.getByText('Critical')).toBeInTheDocument();
    expect(timeouts.getByText('Rapid IMEI')).toBeInTheDocument();
    expect(timeouts.getByText('Supplier')).toBeInTheDocument();
    expect(timeouts.getByText('23.4 % > 20 % for 3m')).toBeInTheDocument();
    expect(timeouts.getByText('Firing')).toBeInTheDocument();
    expect(timeouts.getByText(/\d+m ago/)).toBeInTheDocument();

    const oldest = rowOf(table, 'Oldest queued job');
    expect(oldest.getByText('Warning')).toBeInTheDocument();
    // A queue is a code, so it prints in mono; durations are in words, with their unit.
    expect(oldest.getByText('orders.dispatch')).toHaveClass('mono');
    expect(oldest.getByText('3m 12s > 2m for 2m')).toBeInTheDocument();
  });

  it('lists the most severe open alerts first, whatever their age', async () => {
    await openAlerts({ scenario: 'outage' });
    const table = await alertsTable();
    const names = table
      .getAllByRole('row')
      .slice(1)
      .map((row) => within(row).getAllByRole('cell')[0].textContent);
    // The server sends the warning first (it is the newest); the two critical alerts come above it.
    expect(names).toEqual([
      expect.stringContaining('API 5xx rate'),
      expect.stringContaining('Database connections'),
      expect.stringContaining('Oldest queued job'),
    ]);
    expect(rowOf(table, 'Oldest queued job').getByText('Warning')).toBeInTheDocument();
  });

  it('keeps Acknowledge the right-most button, with or without Declare incident beside it', async () => {
    await openAlerts({ scenario: 'outage' });
    const table = await alertsTable();
    const buttons = (name: string) =>
      rowOf(table, name)
        .getAllByRole('button')
        .map((button) => button.textContent);
    expect(buttons('API 5xx rate')).toEqual(['Declare incident', 'Acknowledge']);
    // The database alert has its incident already, so Acknowledge is all that is left.
    expect(buttons('Database connections')).toEqual(['Acknowledge']);
  });

  it('shows who acknowledged an open alert, when, and their note', async () => {
    await openAlerts({ scenario: 'maintenance' });
    const table = await alertsTable();
    const row = rowOf(table, 'Ledger mismatch');
    expect(row.getByText('Acknowledged')).toBeInTheDocument();
    expect(row.getAllByText('Dana M.')).toHaveLength(TWICE);
    expect(row.getAllByText(/^· \d+m ago$/)).toHaveLength(TWICE);
    expect(row.getAllByText(/Checking the Basra Unlock Center wallet/)).toHaveLength(TWICE);
    expect(row.getByText('1 > 0 for 1m')).toBeInTheDocument();
    // It is still open, so it needs no Acknowledge, but an incident can start from it.
    expect(row.queryByRole('button', { name: 'Acknowledge' })).not.toBeInTheDocument();
    expect(row.getByRole('button', { name: 'Declare incident' })).toBeInTheDocument();
  });

  it('links the incident that was declared from an alert', async () => {
    await openAlerts({ scenario: 'degraded' });
    const table = await alertsTable();
    const link = rowOf(table, 'Supplier timeouts').getByRole('link', { name: /^Incident #\d+$/ });
    expect(link).toHaveAttribute(
      'href',
      expect.stringMatching(/^\/system-health\?tab=alerts&view=incidents&incident=\d+$/),
    );
    // One incident per alert: the row offers no second one.
    expect(
      rowOf(table, 'Supplier timeouts').queryByRole('button', { name: 'Declare incident' }),
    ).not.toBeInTheDocument();
  });

  it('says that an empty list is not good news when monitoring is down, once', async () => {
    await openAlerts({ scenario: 'monitoring-down' });
    // Not "No open alerts": with the rules unchecked, nothing can be said. The empty state says it; a note would repeat it.
    expect(await screen.findByRole('heading', { name: 'No alerts listed' }, SLOW)).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'No open alerts' })).not.toBeInTheDocument();
    expect(screen.getByText(/this is not a sign that all is well/)).toBeInTheDocument();
    expect(screen.queryByRole('note')).not.toBeInTheDocument();
  });

  it('puts a note above the rows when monitoring is down and the list has rows', async () => {
    await openAlerts({ scenario: 'monitoring-down', route: '/system-health?tab=alerts&status=all' });
    const note = await screen.findByRole('note', undefined, SLOW);
    expect(note).toHaveTextContent('Monitoring is unavailable, so alert rules may not be checked right now.');
    expect(note).toHaveTextContent('This list can be out of date.');
    expect((await alertsTable()).getAllByRole('row').length).toBeGreaterThan(5);
  });

  it('does not draw that note when the role cannot read the health summary', async () => {
    await openAlerts({ scenario: 'monitoring-down', permissions: ['alerts:read'] });
    expect(await screen.findByRole('heading', { name: 'No open alerts' }, SLOW)).toBeInTheDocument();
    expect(screen.queryByText(/alert rules may not be checked right now/)).not.toBeInTheDocument();
  });

  it('shows the server error with Retry when the read fails, and keeps the filter', async () => {
    mockServer.use(
      http.get('*/admin/alerts', () =>
        problem(500, 'INTERNAL_ERROR', 'Something went wrong', 'The alert store did not answer.'),
      ),
    );
    await openAlerts();
    expect(await screen.findByText('Could not load the alerts', undefined, SLOW)).toBeInTheDocument();
    expect(screen.getByText('The alert store did not answer.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Alert status' })).toBeInTheDocument();
  });
});

describe('the status filter', () => {
  it('asks the server for one status per choice and keeps the choice in the address', async () => {
    const user = userEvent.setup();
    const reads = recordRequests('get', '/admin/alerts');
    const app = await openAlerts({ scenario: 'degraded' });
    await alertsTable();
    // "Open" is two reads: the firing ones and the acknowledged ones.
    const statuses = () => reads.map((read) => read.url.searchParams.get('status'));
    expect(statuses()).toEqual(expect.arrayContaining(['firing', 'acknowledged']));

    await user.click(screen.getByRole('button', { name: 'Resolved' }));
    await waitFor(() => expect(app.location()).toBe('/system-health?tab=alerts&status=resolved'));
    await waitFor(() => expect(statuses()).toContain('resolved'));
    const table = await alertsTable();
    await waitFor(() => expect(table.queryByText('Firing')).not.toBeInTheDocument(), SLOW);
    expect(table.getAllByText('Resolved').length).toBeGreaterThan(5);
    // A resolved alert says how long it lasted, and offers no action.
    expect(table.getAllByText(/^lasted /).length).toBeGreaterThan(5);
    expect(table.queryByRole('button', { name: 'Acknowledge' })).not.toBeInTheDocument();
    expect(table.queryByRole('button', { name: 'Declare incident' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Open' }));
    await waitFor(() => expect(app.location()).toBe('/system-health?tab=alerts'));
  });

  it('opens on the choice named in the address', async () => {
    await openAlerts({ scenario: 'degraded', route: '/system-health?tab=alerts&status=firing' });
    const table = await alertsTable();
    expect(screen.getByRole('button', { name: 'Firing' })).toHaveAttribute('aria-pressed', 'true');
    expect(table.getAllByRole('row').slice(1)).toHaveLength(2);
  });

  it('says what each empty choice would hold', async () => {
    const user = userEvent.setup();
    await openAlerts({ scenario: 'degraded' });
    await alertsTable();
    await user.click(screen.getByRole('button', { name: 'Acknowledged' }));
    expect(await screen.findByRole('heading', { name: 'No acknowledged alerts' }, SLOW)).toBeInTheDocument();
    expect(screen.getByText(/Alerts that someone is looking at/)).toBeInTheDocument();
  });
});

describe('who may act', () => {
  const readers = ['system:read', 'alerts:read', 'incidents:read'];

  it('shows no action buttons to a staff member who can only read', async () => {
    await openAlerts({ scenario: 'degraded', permissions: readers });
    const table = await alertsTable();
    expect(table.getAllByRole('row').slice(1)).toHaveLength(2);
    expect(screen.queryByRole('button', { name: 'Acknowledge' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Declare incident' })).not.toBeInTheDocument();
  });

  it('shows none in the read-only scenario either, where every write would answer 403', async () => {
    await openAlerts({ scenario: 'readonly' });
    const table = await alertsTable();
    expect(table.getAllByRole('row').slice(1)).toHaveLength(2);
    expect(screen.queryByRole('button', { name: 'Acknowledge' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Declare incident' })).not.toBeInTheDocument();
  });

  it('disables only the button whose permission is missing, and says which one', async () => {
    await openAlerts({
      scenario: 'degraded',
      permissions: [...readers, 'alerts:update'],
    });
    const table = await alertsTable();
    const row = rowOf(table, 'Oldest queued job');
    expect(row.getByRole('button', { name: 'Acknowledge' })).toBeEnabled();
    const declare = row.getByRole('button', { name: 'Declare incident' });
    expect(declare).toBeDisabled();
    expect(declare).toHaveAttribute('title', 'You need the incidents:create permission');
  });
});

describe('Acknowledge', () => {
  /** Opens the dialog of the alert for a rule. */
  async function openAck(rule: string) {
    const user = userEvent.setup();
    const app = await openAlerts({ scenario: 'degraded' });
    const table = await alertsTable();
    await user.click(rowOf(table, rule).getByRole('button', { name: 'Acknowledge' }));
    const dialog = within(await screen.findByRole('dialog', { name: 'Acknowledge alert' }));
    return { user, app, dialog };
  }

  it('states the effect before the confirm button and names the alert', async () => {
    const { dialog } = await openAck('Oldest queued job');
    expect(dialog.getByText('Stops the reminders; your name and the time are recorded.')).toBeInTheDocument();
    expect(dialog.getByText('3m 12s > 2m for 2m')).toBeInTheDocument();
    expect(dialog.getByLabelText('Note (optional)')).toHaveValue('');
    expect(dialog.getByRole('button', { name: 'Acknowledge' })).toBeInTheDocument();
  });

  it('sends the note, closes, toasts, and the row shows who acknowledged it', async () => {
    const writes = recordRequests('post', '/admin/alerts/:id/ack');
    const { user, dialog } = await openAck('Oldest queued job');
    await user.type(dialog.getByLabelText('Note (optional)'), '  Looking at the dispatch workers.  ');
    await user.click(dialog.getByRole('button', { name: 'Acknowledge' }));

    await waitFor(() => expect(writes).toHaveLength(1), SLOW);
    expect(writes[0].body).toEqual({ note: 'Looking at the dispatch workers.' });
    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: 'Acknowledge alert' })).not.toBeInTheDocument(),
    );
    expect(await screen.findByText('Alert acknowledged')).toBeInTheDocument();
    // The lists were read again: the alert is acknowledged, with the note.
    const row = rowOf(await alertsTable(), 'Oldest queued job');
    await waitFor(() => expect(row.getByText('Acknowledged')).toBeInTheDocument(), SLOW);
    expect(row.getAllByText('Looking at the dispatch workers.')).toHaveLength(TWICE);
    expect(row.queryByRole('button', { name: 'Acknowledge' })).not.toBeInTheDocument();
  });

  it('sends no note when the field is empty', async () => {
    const writes = recordRequests('post', '/admin/alerts/:id/ack');
    const { user, dialog } = await openAck('Supplier timeouts');
    await user.click(dialog.getByRole('button', { name: 'Acknowledge' }));
    await waitFor(() => expect(writes).toHaveLength(1), SLOW);
    expect(writes[0].body).toEqual({});
  });

  it("puts the server's message about the note under the note and keeps the dialog open", async () => {
    const { user, dialog } = await openAck('Supplier timeouts');
    await user.click(dialog.getByLabelText('Note (optional)'));
    await user.paste('x'.repeat(501));
    await user.click(dialog.getByRole('button', { name: 'Acknowledge' }));
    const field = dialog.getByLabelText('Note (optional)');
    await waitFor(() => expect(field).toHaveAttribute('aria-invalid', 'true'), SLOW);
    expect(dialog.getByText('Keep the note under 500 characters.')).toBeInTheDocument();
    expect(screen.getByRole('dialog', { name: 'Acknowledge alert' })).toBeInTheDocument();
  });

  it("shows the server's refusal in the dialog, with no toast", async () => {
    mockServer.use(
      http.post('*/admin/alerts/:id/ack', () =>
        problem(
          409,
          'ALERT_ACKNOWLEDGED',
          'Already acknowledged',
          'Dana M. already acknowledged this alert.',
        ),
      ),
    );
    const { user, dialog } = await openAck('Supplier timeouts');
    await user.click(dialog.getByRole('button', { name: 'Acknowledge' }));
    expect(await dialog.findByRole('alert')).toHaveTextContent('Dana M. already acknowledged this alert.');
    expect(screen.queryByText('Already acknowledged')).not.toBeInTheDocument();
  });

  it('closes with Cancel and sends nothing', async () => {
    const writes = recordRequests('post', '/admin/alerts/:id/ack');
    const { user, dialog } = await openAck('Supplier timeouts');
    await user.click(dialog.getByRole('button', { name: 'Cancel' }));
    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: 'Acknowledge alert' })).not.toBeInTheDocument(),
    );
    expect(writes).toHaveLength(0);
  });
});

describe('Declare incident from an alert', () => {
  async function openDeclare() {
    const user = userEvent.setup();
    await openAlerts({ scenario: 'degraded' });
    const table = await alertsTable();
    await user.click(rowOf(table, 'Oldest queued job').getByRole('button', { name: 'Declare incident' }));
    const dialog = within(await screen.findByRole('dialog', { name: 'Declare incident' }));
    return { user, dialog };
  }

  it('fills the form from the alert and states the effect before the confirm button', async () => {
    const { dialog } = await openDeclare();
    expect(dialog.getByLabelText('Title')).toHaveValue('Oldest queued job · orders.dispatch');
    expect(dialog.getByLabelText('Severity')).toHaveValue('major');
    expect((dialog.getByLabelText('Summary') as HTMLTextAreaElement).value).toMatch(
      /^Oldest queued job for orders\.dispatch: 3m 12s > 2m for 2m\. Started at \d{2}:\d{2}\.$/,
    );
    // A queue alert points at the workers; the health summary supplies the names of the choices.
    expect(await dialog.findByRole('checkbox', { name: 'Queue workers' }, SLOW)).toBeChecked();
    expect(dialog.getByRole('checkbox', { name: 'Postgres' })).not.toBeChecked();
    expect(dialog.getByRole('note')).toHaveTextContent('The incident starts at Investigating');
    expect(dialog.getByText(/^From alert #\d+: Oldest queued job$/)).toBeInTheDocument();
  });

  it('sends the alert with the incident, toasts, and the row then links the incident', async () => {
    const writes = recordRequests('post', '/admin/incidents');
    const { user, dialog } = await openDeclare();
    await dialog.findByRole('checkbox', { name: 'Queue workers' }, SLOW);
    await user.click(dialog.getByRole('checkbox', { name: 'Postgres' }));
    await user.click(dialog.getByRole('button', { name: 'Declare incident' }));

    await waitFor(() => expect(writes).toHaveLength(1), SLOW);
    expect(writes[0].body).toMatchObject({
      title: 'Oldest queued job · orders.dispatch',
      severity: 'major',
      components: ['postgres', 'workers'],
      alertEventId: expect.any(Number),
    });
    expect(await screen.findByText('Incident declared')).toBeInTheDocument();
    const row = rowOf(await alertsTable(), 'Oldest queued job');
    await waitFor(() => expect(row.getByRole('link', { name: /^Incident #\d+$/ })).toBeInTheDocument(), SLOW);
    expect(row.queryByRole('button', { name: 'Declare incident' })).not.toBeInTheDocument();
  });

  it("puts the server's message under the field it names and keeps what was typed", async () => {
    const { user, dialog } = await openDeclare();
    const summary = dialog.getByLabelText('Summary');
    await user.clear(summary);
    await user.type(summary, 'Too short');
    await user.click(dialog.getByRole('button', { name: 'Declare incident' }));
    await waitFor(() => expect(summary).toHaveAttribute('aria-invalid', 'true'), SLOW);
    expect(dialog.getByText('Describe what is happening in at least 10 characters.')).toBeInTheDocument();
    expect(dialog.getByLabelText('Title')).toHaveValue('Oldest queued job · orders.dispatch');
  });

  it('needs at least one component before it sends anything', async () => {
    const writes = recordRequests('post', '/admin/incidents');
    const { user, dialog } = await openDeclare();
    await user.click(await dialog.findByRole('checkbox', { name: 'Queue workers' }, SLOW));
    await user.click(dialog.getByRole('button', { name: 'Declare incident' }));
    expect(await dialog.findByText('Choose at least one affected component.')).toBeInTheDocument();
    expect(writes).toHaveLength(0);
  });
});
