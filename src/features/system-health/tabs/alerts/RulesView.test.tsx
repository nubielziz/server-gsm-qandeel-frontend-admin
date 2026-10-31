// Tests for the Rules view, run through the whole app against the dev mock API: the table, the on/off switch and Unmute
// (no dialog, so a refusal is a toast), Mute, Edit, Delete and New rule (dialogs that show the server's answer).
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
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

const RULES = '/admin/alert-rules/:id';

/** Opens the Rules view and waits for its table. */
async function openRules(options: OpenHealthOptions = {}) {
  const app = await openHealthPage({ route: '/system-health?tab=alerts&view=rules', ...options });
  const table = within(await screen.findByRole('table', { name: 'Alert rules' }, SLOW));
  return { app, table };
}

/** The table row that holds some text (a rule name). */
function rowOf(table: ReturnType<typeof within>, text: string) {
  const row = table.getByText(text).closest('tr');
  if (!row) throw new Error(`No row holds "${text}".`);
  return within(row);
}

describe('the table', () => {
  it('lists each rule with its condition, severity, channels, switch and mute, rules with an open alert first', async () => {
    const { table } = await openRules({ scenario: 'degraded' });
    const names = table
      .getAllByRole('row')
      .slice(1)
      .map((row) => within(row).getAllByRole('cell')[0].textContent);
    expect(names).toHaveLength(10);
    // The server flags the rules that have an open alert; they come first, then the server's order (by name).
    expect(names.slice(0, 2)).toEqual([
      expect.stringContaining('Oldest queued job'),
      expect.stringContaining('Supplier timeouts'),
    ]);

    const timeouts = rowOf(table, 'Supplier timeouts');
    expect(timeouts.getByText('Alert open')).toBeInTheDocument();
    expect(timeouts.getByText('supplier_timeout_rate')).toHaveClass('mono');
    expect(timeouts.getByText('supplier.timeout_rate')).toHaveClass('mono');
    expect(timeouts.getByText('> 20 % for 3m')).toBeInTheDocument();
    expect(timeouts.getByText('Critical')).toBeInTheDocument();
    expect(timeouts.getByText('Telegram, Email')).toBeInTheDocument();
    expect(timeouts.getByRole('switch', { name: 'Enable Supplier timeouts' })).toBeChecked();

    const slow = rowOf(table, 'API p95 latency');
    expect(slow.queryByText('Alert open')).not.toBeInTheDocument();
    expect(slow.getByText('> 1.5 s for 5m')).toBeInTheDocument();
    expect(slow.getByText('Warning')).toBeInTheDocument();
  });

  it('shows a switched-off rule and a muted one', async () => {
    const { table } = await openRules();
    expect(
      rowOf(table, 'Redis memory').getByRole('switch', { name: 'Enable Redis memory' }),
    ).not.toBeChecked();
    const muted = rowOf(table, 'Supplier balance low');
    expect(muted.getByText(/^Until /)).toBeInTheDocument();
    expect(muted.getByRole('button', { name: 'Unmute' })).toBeInTheDocument();
    // A rule that is not muted has no Unmute, and offers Mute.
    const plain = rowOf(table, 'API 5xx rate');
    expect(plain.queryByRole('button', { name: 'Unmute' })).not.toBeInTheDocument();
    expect(plain.getByRole('button', { name: 'Mute' })).toBeInTheDocument();
    expect(muted.queryByRole('button', { name: 'Mute' })).not.toBeInTheDocument();
  });

  it('says the mute in words under "Muted", and keeps Mute and Unmute with the other buttons', async () => {
    const { table } = await openRules();
    const mutedCell = (name: string) => {
      const row = table.getByText(name).closest('tr');
      const column = table.getAllByRole('columnheader').findIndex((head) => head.textContent === 'Muted');
      return within(within(row!).getAllByRole('cell')[column]);
    };
    // The column is a state, never a control: "Muted: Mute" read as if the rule were muted.
    expect(mutedCell('API 5xx rate').getByText('–')).toBeInTheDocument();
    expect(mutedCell('API 5xx rate').queryByRole('button')).not.toBeInTheDocument();
    expect(mutedCell('Supplier balance low').getByText(/^Until /)).toBeInTheDocument();
    expect(mutedCell('Supplier balance low').queryByRole('button')).not.toBeInTheDocument();

    // Every rule has the same three buttons, so Edit and Delete never move; only the first one changes.
    const buttons = (name: string) =>
      rowOf(table, name)
        .getAllByRole('button')
        .map((button) => button.textContent);
    expect(buttons('API 5xx rate')).toEqual(['Mute', 'Edit', 'Delete']);
    expect(buttons('Supplier balance low')).toEqual(['Unmute', 'Edit', 'Delete']);
  });

  it('shows the server error with Retry when the read fails', async () => {
    mockServer.use(
      http.get('*/admin/alert-rules', () =>
        problem(500, 'INTERNAL_ERROR', 'Something went wrong', 'The rules could not be read.'),
      ),
    );
    await openHealthPage({ route: '/system-health?tab=alerts&view=rules' });
    expect(await screen.findByText('Could not load the alert rules', undefined, SLOW)).toBeInTheDocument();
    expect(screen.getByText('The rules could not be read.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
  });
});

describe('the switch', () => {
  it('sends isActive, toasts what changed, and shows the new state', async () => {
    const user = userEvent.setup();
    const writes = recordRequests('patch', RULES);
    const { table } = await openRules();
    await user.click(rowOf(table, 'Redis memory').getByRole('switch', { name: 'Enable Redis memory' }));

    await waitFor(() => expect(writes).toHaveLength(1), SLOW);
    expect(writes[0].body).toEqual({ isActive: true });
    expect(await screen.findByText('Rule switched on')).toBeInTheDocument();
    await waitFor(() => expect(rowOf(table, 'Redis memory').getByRole('switch')).toBeChecked(), SLOW);
  });

  it('switches a rule off, and says it will not alert', async () => {
    const user = userEvent.setup();
    const writes = recordRequests('patch', RULES);
    const { table } = await openRules();
    await user.click(rowOf(table, 'API 5xx rate').getByRole('switch', { name: 'Enable API 5xx rate' }));
    await waitFor(() => expect(writes).toHaveLength(1), SLOW);
    expect(writes[0].body).toEqual({ isActive: false });
    expect(await screen.findByText('Rule switched off')).toBeInTheDocument();
  });

  it("shows the server's refusal as an error toast, and the switch keeps its old state", async () => {
    mockServer.use(
      http.patch('*/admin/alert-rules/:id', () =>
        problem(403, 'FORBIDDEN', 'Forbidden', 'You need the alerts:update permission.'),
      ),
    );
    const user = userEvent.setup();
    const { table } = await openRules();
    await user.click(rowOf(table, 'Redis memory').getByRole('switch', { name: 'Enable Redis memory' }));
    expect(
      await screen.findByText(/^You need the alerts:update permission\./, undefined, SLOW),
    ).toBeInTheDocument();
    expect(screen.getByText('Forbidden')).toBeInTheDocument();
    await waitFor(() => expect(rowOf(table, 'Redis memory').getByRole('switch')).not.toBeChecked());
  });
});

describe('Unmute', () => {
  it('sends a null mutedUntil, toasts, and the mute is gone', async () => {
    const user = userEvent.setup();
    const writes = recordRequests('patch', RULES);
    const { table } = await openRules();
    await user.click(rowOf(table, 'Supplier balance low').getByRole('button', { name: 'Unmute' }));
    await waitFor(() => expect(writes).toHaveLength(1), SLOW);
    expect(writes[0].body).toEqual({ mutedUntil: null });
    expect(await screen.findByText('Rule unmuted')).toBeInTheDocument();
    await waitFor(
      () =>
        expect(
          rowOf(table, 'Supplier balance low').queryByRole('button', { name: 'Unmute' }),
        ).not.toBeInTheDocument(),
      SLOW,
    );
  });

  it("shows the server's refusal as an error toast", async () => {
    mockServer.use(
      http.patch('*/admin/alert-rules/:id', () =>
        problem(500, 'INTERNAL_ERROR', 'Something went wrong', 'Try again in a moment.'),
      ),
    );
    const user = userEvent.setup();
    const { table } = await openRules();
    await user.click(rowOf(table, 'Supplier balance low').getByRole('button', { name: 'Unmute' }));
    expect(await screen.findByText(/^Try again in a moment\./, undefined, SLOW)).toBeInTheDocument();
    expect(rowOf(table, 'Supplier balance low').getByRole('button', { name: 'Unmute' })).toBeInTheDocument();
  });
});

describe('Mute', () => {
  async function openMute(rule = 'API 5xx rate') {
    const user = userEvent.setup();
    const { table } = await openRules();
    await user.click(rowOf(table, rule).getByRole('button', { name: 'Mute' }));
    const dialog = within(await screen.findByRole('dialog', { name: 'Mute rule' }));
    return { user, table, dialog };
  }

  it('states the effect before the confirm button and asks for a date and time', async () => {
    const { dialog } = await openMute();
    expect(dialog.getByRole('note')).toHaveTextContent(
      'Stops this rule from sending messages until the time you choose, then it alerts again by itself.',
    );
    expect(dialog.getByLabelText('Muted until')).toHaveAttribute('type', 'datetime-local');
    expect(dialog.getByRole('button', { name: 'Mute rule' })).toBeInTheDocument();
  });

  it('needs a time before it sends anything', async () => {
    const writes = recordRequests('patch', RULES);
    const { user, dialog } = await openMute();
    await user.click(dialog.getByRole('button', { name: 'Mute rule' }));
    expect(await dialog.findByText('Choose when the mute ends.')).toBeInTheDocument();
    expect(writes).toHaveLength(0);
  });

  it('sends the end time of a quick choice, toasts, and the row shows the mute with Unmute', async () => {
    const writes = recordRequests('patch', RULES);
    const { user, table, dialog } = await openMute();
    const before = Date.now();
    await user.click(dialog.getByRole('button', { name: '8 hours' }));
    await user.click(dialog.getByRole('button', { name: 'Mute rule' }));

    await waitFor(() => expect(writes).toHaveLength(1), SLOW);
    const body = writes[0].body as { mutedUntil: string };
    expect(Object.keys(body)).toEqual(['mutedUntil']);
    // Eight hours from now, to the minute the field holds.
    const hours = (Date.parse(body.mutedUntil) - before) / 3_600_000;
    expect(hours).toBeGreaterThan(7.9);
    expect(hours).toBeLessThan(8.1);
    expect(await screen.findByText('Rule muted')).toBeInTheDocument();
    await waitFor(
      () => expect(rowOf(table, 'API 5xx rate').getByRole('button', { name: 'Unmute' })).toBeInTheDocument(),
      SLOW,
    );
  });

  it("puts the server's message about a time in the past under the field and keeps the dialog open", async () => {
    const { user, dialog } = await openMute();
    await user.type(dialog.getByLabelText('Muted until'), '2020-01-01T10:00');
    await user.click(dialog.getByRole('button', { name: 'Mute rule' }));
    const field = dialog.getByLabelText('Muted until');
    await waitFor(() => expect(field).toHaveAttribute('aria-invalid', 'true'), SLOW);
    expect(dialog.getByText('Mute until a time in the future, or send null to unmute.')).toBeInTheDocument();
    expect(screen.getByRole('dialog', { name: 'Mute rule' })).toBeInTheDocument();
  });
});

describe('Edit', () => {
  async function openEdit(rule = 'API 5xx rate') {
    const user = userEvent.setup();
    const { table } = await openRules();
    await user.click(rowOf(table, rule).getByRole('button', { name: 'Edit' }));
    const dialog = within(await screen.findByRole('dialog', { name: 'Edit alert rule' }));
    return { user, table, dialog };
  }

  it("fills the form with the rule's own values", async () => {
    const { dialog } = await openEdit();
    expect(dialog.getByLabelText('Name')).toHaveValue('API 5xx rate');
    expect(dialog.getByLabelText('Key')).toHaveValue('api_rate5xx');
    expect(dialog.getByLabelText('Metric')).toHaveValue('api.rate5xx');
    expect(dialog.getByLabelText('Fires when it is')).toHaveValue('gt');
    expect(dialog.getByLabelText('Threshold')).toHaveValue(2);
    expect(dialog.getByLabelText('For (seconds)')).toHaveValue(300);
    expect(dialog.getByLabelText('Severity')).toHaveValue('critical');
    expect(dialog.getByRole('checkbox', { name: 'Telegram' })).toBeChecked();
    expect(dialog.getByRole('checkbox', { name: 'Email' })).toBeChecked();
    expect(dialog.getByRole('checkbox', { name: 'Active' })).toBeChecked();
    expect(dialog.getByText('In %.')).toBeInTheDocument();
  });

  it('sends only the field that changed, toasts, and the table shows the new limit', async () => {
    const writes = recordRequests('patch', RULES);
    const { user, table, dialog } = await openEdit();
    const threshold = dialog.getByLabelText('Threshold');
    await user.clear(threshold);
    await user.type(threshold, '3.5');
    await user.click(dialog.getByRole('button', { name: 'Save changes' }));

    await waitFor(() => expect(writes).toHaveLength(1), SLOW);
    expect(writes[0].body).toEqual({ threshold: 3.5 });
    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: 'Edit alert rule' })).not.toBeInTheDocument(),
    );
    expect(await screen.findByText('Rule updated')).toBeInTheDocument();
    await waitFor(
      () => expect(rowOf(table, 'API 5xx rate').getByText('> 3.5 % for 5m')).toBeInTheDocument(),
      SLOW,
    );
  });

  it('sends nothing and just closes when nothing changed', async () => {
    const writes = recordRequests('patch', RULES);
    const { user, dialog } = await openEdit();
    await user.click(dialog.getByRole('button', { name: 'Save changes' }));
    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: 'Edit alert rule' })).not.toBeInTheDocument(),
    );
    expect(writes).toHaveLength(0);
  });

  it("puts the server's messages under their fields and keeps what was typed", async () => {
    const { user, dialog } = await openEdit();
    const windowField = dialog.getByLabelText('For (seconds)');
    await user.clear(windowField);
    await user.type(windowField, '30');
    const key = dialog.getByLabelText('Key');
    await user.clear(key);
    await user.type(key, 'api_p95_latency');
    await user.click(dialog.getByRole('button', { name: 'Save changes' }));

    await waitFor(() => expect(windowField).toHaveAttribute('aria-invalid', 'true'), SLOW);
    expect(dialog.getByText('Enter a whole number of seconds from 60 to 86400.')).toBeInTheDocument();
    expect(key).toHaveAttribute('aria-invalid', 'true');
    expect(dialog.getByText('A rule with this key already exists.')).toBeInTheDocument();
    expect(screen.getByRole('dialog', { name: 'Edit alert rule' })).toBeInTheDocument();
    expect(windowField).toHaveValue(30);
  });

  it('keeps a metric the form does not know, and sends only what changed', async () => {
    const legacy = {
      id: 77,
      key: 'legacy_rule',
      name: 'Legacy rule',
      metric: 'legacy.metric',
      comparator: 'gt',
      threshold: 5,
      windowSeconds: 120,
      severity: 'info',
      channels: ['email'],
      unit: null,
      isActive: true,
      mutedUntil: null,
      open: false,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: null,
    };
    mockServer.use(
      http.get('*/admin/alert-rules', () =>
        HttpResponse.json([legacy], { headers: { 'x-total-count': '1' } }),
      ),
    );
    const writes = recordRequests('patch', RULES);
    const user = userEvent.setup();
    const { table } = await openRules();
    await user.click(rowOf(table, 'Legacy rule').getByRole('button', { name: 'Edit' }));
    const dialog = within(await screen.findByRole('dialog', { name: 'Edit alert rule' }));
    expect(dialog.getByLabelText('Metric')).toHaveValue('legacy.metric');
    await user.click(dialog.getByRole('checkbox', { name: 'Telegram' }));
    await user.click(dialog.getByRole('button', { name: 'Save changes' }));
    await waitFor(() => expect(writes).toHaveLength(1), SLOW);
    expect(writes[0].body).toEqual({ channels: ['telegram', 'email'] });
  });
});

describe('Delete', () => {
  async function openDelete(rule = 'Redis memory') {
    const user = userEvent.setup();
    const { table } = await openRules();
    await user.click(rowOf(table, rule).getByRole('button', { name: 'Delete' }));
    const dialog = within(await screen.findByRole('dialog', { name: 'Delete rule?' }));
    return { user, table, dialog };
  }

  it('states the effect before the confirm button', async () => {
    const { dialog } = await openDelete();
    expect(dialog.getByText(/stops alerting for good and cannot be brought back/)).toBeInTheDocument();
    expect(dialog.getByText(/mute the rule or switch it off instead/)).toBeInTheDocument();
    expect(dialog.queryByText(/An alert of this rule is open now/)).not.toBeInTheDocument();
  });

  it('warns when an alert of the rule is open', async () => {
    const user = userEvent.setup();
    const { table } = await openRules({ scenario: 'degraded' });
    await user.click(rowOf(table, 'Supplier timeouts').getByRole('button', { name: 'Delete' }));
    const dialog = within(await screen.findByRole('dialog', { name: 'Delete rule?' }));
    expect(dialog.getByText('An alert of this rule is open now.')).toBeInTheDocument();
  });

  it('deletes the rule, toasts, and the row is gone', async () => {
    const calls: string[] = [];
    mockServer.use(
      http.delete('*/admin/alert-rules/:id', ({ request }) => {
        calls.push(new URL(request.url).pathname);
      }),
    );
    const { user, table, dialog } = await openDelete();
    await user.click(dialog.getByRole('button', { name: 'Delete rule' }));
    await waitFor(() => expect(calls).toHaveLength(1), SLOW);
    expect(calls[0]).toMatch(/\/admin\/alert-rules\/\d+$/);
    expect(await screen.findByText('Alert rule deleted')).toBeInTheDocument();
    await waitFor(() => expect(table.queryByText('Redis memory')).not.toBeInTheDocument(), SLOW);
    expect(table.getAllByRole('row').slice(1)).toHaveLength(9);
  });

  it("shows the server's refusal in the dialog and keeps the rule", async () => {
    mockServer.use(
      http.delete('*/admin/alert-rules/:id', () =>
        problem(403, 'FORBIDDEN', 'Forbidden', 'You need the alerts:delete permission.'),
      ),
    );
    const { user, table, dialog } = await openDelete();
    await user.click(dialog.getByRole('button', { name: 'Delete rule' }));
    expect(await dialog.findByRole('alert')).toHaveTextContent('You need the alerts:delete permission.');
    expect(table.getByText('Redis memory')).toBeInTheDocument();
  });
});

describe('New rule', () => {
  async function openNew() {
    const user = userEvent.setup();
    const { table } = await openRules();
    await user.click(screen.getByRole('button', { name: 'New rule' }));
    const dialog = within(await screen.findByRole('dialog', { name: 'New alert rule' }));
    return { user, table, dialog };
  }

  it('starts switched on, with Telegram, a 5 minute window and nothing else chosen', async () => {
    const { dialog } = await openNew();
    expect(dialog.getByLabelText('Name')).toHaveValue('');
    expect(dialog.getByLabelText('Metric')).toHaveValue('');
    expect(dialog.getByLabelText('For (seconds)')).toHaveValue(300);
    expect(dialog.getByRole('checkbox', { name: 'Telegram' })).toBeChecked();
    expect(dialog.getByRole('checkbox', { name: 'Email' })).not.toBeChecked();
    expect(dialog.getByRole('checkbox', { name: 'Active' })).toBeChecked();
    expect(dialog.getByRole('button', { name: 'Create rule' })).toBeInTheDocument();
  });

  it('asks for what is missing and sends nothing until it has it', async () => {
    const writes = recordRequests('post', '/admin/alert-rules');
    const { user, dialog } = await openNew();
    await user.click(dialog.getByRole('checkbox', { name: 'Telegram' }));
    await user.click(dialog.getByRole('button', { name: 'Create rule' }));
    expect(await dialog.findByText('Enter a name.')).toBeInTheDocument();
    expect(dialog.getByText('Enter a key.')).toBeInTheDocument();
    expect(dialog.getByText('Choose a metric.')).toBeInTheDocument();
    expect(dialog.getByText('Enter a number.')).toBeInTheDocument();
    expect(dialog.getByText('Choose at least one channel.')).toBeInTheDocument();
    expect(writes).toHaveLength(0);
  });

  it("puts the server's message about the key under it", async () => {
    const { user, dialog } = await openNew();
    await user.type(dialog.getByLabelText('Name'), 'Webhook backlog');
    await user.type(dialog.getByLabelText('Key'), 'Bad Key');
    await user.selectOptions(dialog.getByLabelText('Metric'), 'queue.oldest_age');
    await user.type(dialog.getByLabelText('Threshold'), '300');
    await user.click(dialog.getByRole('button', { name: 'Create rule' }));
    const key = dialog.getByLabelText('Key');
    await waitFor(() => expect(key).toHaveAttribute('aria-invalid', 'true'), SLOW);
    expect(dialog.getByText(/^Use 3 to 41 lowercase letters/)).toBeInTheDocument();
    expect(screen.getByRole('dialog', { name: 'New alert rule' })).toBeInTheDocument();
  });

  it('creates the rule, toasts, and the new row shows in the table', async () => {
    const writes = recordRequests('post', '/admin/alert-rules');
    const { user, table, dialog } = await openNew();
    await user.type(dialog.getByLabelText('Name'), 'Webhook backlog');
    await user.type(dialog.getByLabelText('Key'), 'webhook_backlog');
    await user.selectOptions(dialog.getByLabelText('Metric'), 'queue.oldest_age');
    expect(dialog.getByText('In seconds.')).toBeInTheDocument();
    await user.selectOptions(dialog.getByLabelText('Fires when it is'), 'gte');
    await user.type(dialog.getByLabelText('Threshold'), '300');
    await user.click(dialog.getByRole('checkbox', { name: 'Email' }));
    await user.click(dialog.getByRole('button', { name: 'Create rule' }));

    await waitFor(() => expect(writes).toHaveLength(1), SLOW);
    expect(writes[0].body).toEqual({
      key: 'webhook_backlog',
      name: 'Webhook backlog',
      metric: 'queue.oldest_age',
      comparator: 'gte',
      threshold: 300,
      windowSeconds: 300,
      severity: 'warning',
      channels: ['telegram', 'email'],
      isActive: true,
    });
    expect(await screen.findByText('Alert rule created')).toBeInTheDocument();
    await waitFor(() => expect(table.getByText('Webhook backlog')).toBeInTheDocument(), SLOW);
    expect(rowOf(table, 'Webhook backlog').getByText('≥ 5m for 5m')).toBeInTheDocument();
  });
});

describe('who may act', () => {
  const readers = ['system:read', 'alerts:read', 'incidents:read'];

  it('shows no buttons to a staff member who can only read, and the switch as a word', async () => {
    const { table } = await openRules({ scenario: 'degraded', permissions: readers });
    expect(table.getAllByRole('row').slice(1)).toHaveLength(10);
    for (const name of ['New rule', 'Edit', 'Mute', 'Unmute', 'Delete']) {
      expect(screen.queryByRole('button', { name })).not.toBeInTheDocument();
    }
    expect(screen.queryByRole('switch')).not.toBeInTheDocument();
    expect(rowOf(table, 'Supplier timeouts').getByText('On')).toBeInTheDocument();
    expect(rowOf(table, 'Redis memory').getByText('Off')).toBeInTheDocument();
    // The mute is still told in words, and a rule that is not muted says so with a dash.
    expect(rowOf(table, 'Supplier balance low').getByText(/^Until /)).toBeInTheDocument();
    expect(rowOf(table, 'API 5xx rate').getByText('–')).toBeInTheDocument();
  });

  it('shows none in the read-only scenario either', async () => {
    const { table } = await openRules({ scenario: 'readonly' });
    expect(table.getAllByRole('row').slice(1)).toHaveLength(10);
    expect(screen.queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument();
    expect(screen.queryByRole('switch')).not.toBeInTheDocument();
  });

  it('disables only what is missing, and says which permission', async () => {
    const { table } = await openRules({ permissions: [...readers, 'alerts:update'] });
    const row = rowOf(table, 'API 5xx rate');
    expect(row.getByRole('button', { name: 'Edit' })).toBeEnabled();
    expect(row.getByRole('button', { name: 'Mute' })).toBeEnabled();
    expect(row.getByRole('switch', { name: 'Enable API 5xx rate' })).toBeEnabled();
    const remove = row.getByRole('button', { name: 'Delete' });
    expect(remove).toBeDisabled();
    expect(remove).toHaveAttribute('title', 'You need the alerts:delete permission');
    const add = screen.getByRole('button', { name: 'New rule' });
    expect(add).toBeDisabled();
    expect(add).toHaveAttribute('title', 'You need the alerts:create permission');
  });

  it('disables the switch and says why for a staff member who may write elsewhere but not here', async () => {
    const { table } = await openRules({ permissions: [...readers, 'incidents:create'] });
    const toggle = rowOf(table, 'API 5xx rate').getByRole('switch', { name: 'Enable API 5xx rate' });
    expect(toggle).toBeDisabled();
    expect(toggle.closest('span')).toHaveAttribute('title', 'You need the alerts:update permission');
  });
});
