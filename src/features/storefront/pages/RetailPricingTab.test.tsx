// Tests for the retail pricing rules (the Shop price rules tab of the Price Rules view, opened through the real app): the table and its words, the empty state with the owner's example, the two-step
// dialog (the form, the server's preview, Save the rule) for a new rule and an edit, the server's refusals under their fields,
// and the review before a rule is turned off, turned on or deleted. The price changes block has its own file.
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mockServer } from '@/mocks/node';
import { problem } from '@/mocks/problem';
import { setupMockApi } from '@/test/renderApp';
import { recordRequests } from '../test/requests';
import { dialogOf, openProductsView, rowOf, tableNamed } from '../test/storefrontPage';

setupMockApi();
vi.setConfig({ testTimeout: 30_000 });
afterEach(() => vi.restoreAllMocks());

const RULES = 'Retail pricing rules';
const PRICING = '/products?view=rules&tab=shop';
type User = ReturnType<typeof userEvent.setup>;

/** Opens the tab and waits for the rules. */
async function openPricing(options: { permissions?: string[] } = {}) {
  const app = await openProductsView(PRICING, options);
  await tableNamed(RULES);
  return app;
}

/** The last request of a method (a write is followed by the reads it makes stale, so `last()` would be a GET). */
function lastWrite(requests: ReturnType<typeof recordRequests>, method: string) {
  const found = requests.sent().filter((sent) => sent.method === method);
  const last = found[found.length - 1];
  if (!last) throw new Error(`No ${method} request was sent.`);
  return last;
}

/** The server with no rule at all. */
function noRules() {
  mockServer.use(
    http.get('*/admin/retail-price-rules', () =>
      HttpResponse.json([], { headers: { 'x-total-count': '0' } }),
    ),
  );
}

/** Opens New rule from the pinned bar. */
async function openNewRule(user: User) {
  await user.click(await screen.findByRole('button', { name: 'New rule' }));
  return dialogOf('New retail pricing rule');
}

/** Fills the form of a new rule for the Remote type with a 12.5% margin. */
async function fillRemote(user: User, dialog: ReturnType<typeof dialogOf>) {
  await user.selectOptions(dialog.getByRole('combobox', { name: 'Applies to' }), 'A service type');
  await user.selectOptions(dialog.getByRole('combobox', { name: 'Service type' }), 'Remote');
  await user.type(dialog.getByRole('textbox', { name: /^Margin/ }), '12.5');
}

describe('the rules table', () => {
  it('lists the rules in the server’s order with its words, the follow limit, the followers and the status', async () => {
    await openPricing();
    const table = await tableNamed(RULES);
    expect(table.getAllByRole('row')).toHaveLength(5); // the header and four rules
    const global = await rowOf(RULES, 'Every service');
    expect(global.getByText('Every service +25%, ends in .99')).toBeInTheDocument();
    expect(global.getByText('25%')).toBeInTheDocument();
    expect(global.getByText('3')).toBeInTheDocument();
    expect(global.getByText('On')).toBeInTheDocument();
    const imei = await rowOf(RULES, 'IMEI');
    expect(imei.getByText('IMEI +30%')).toBeInTheDocument();
    expect(imei.getByText('4')).toBeInTheDocument();
    const carrier = await rowOf(RULES, 'Carrier unlock');
    expect(carrier.getByText('Carrier unlock +20% +$0.50, up to 5 cents')).toBeInTheDocument();
    expect(carrier.getByText('15%')).toBeInTheDocument();
    const server = await rowOf(RULES, 'Server');
    expect(server.getByText('Off')).toBeInTheDocument();
    expect(server.getByRole('button', { name: 'Turn on the rule for Server services' })).toBeInTheDocument();
  });

  it('draws the status as a square and a word, and the applies-to as plain words, with no badge or tag', async () => {
    await openPricing();
    const table = await screen.findByRole('table', { name: RULES });
    expect(table.querySelector('.badge, .tag')).toBeNull();
    const global = await rowOf(RULES, 'Every service');
    expect(global.getByText('On').previousElementSibling).toHaveClass('status-sq', 'status-sq-ok');
    const server = await rowOf(RULES, 'Server');
    expect(server.getByText('Off').previousElementSibling).toHaveClass('status-sq', 'status-sq-off');
    expect((await rowOf(RULES, 'IMEI')).getByText('IMEI')).toHaveClass('font-medium');
  });

  it('keeps New rule, the view’s one primary button, in the pinned bar and not in a header', async () => {
    await openPricing();
    const button = await screen.findByRole('button', { name: 'New rule' });
    expect(button.className).toContain('btn-primary');
    expect(button.closest('.pinned-bar')).not.toBeNull();
    expect(screen.getByRole('region', { name: 'Shop price rules' }).querySelector('.panel')).toBeNull();
  });

  it('says there is no rule yet and starts the first rule on the owner’s example', async () => {
    const user = userEvent.setup();
    noRules();
    await openProductsView(PRICING);
    expect(await screen.findByText('No retail pricing rule yet')).toBeInTheDocument();
    expect(screen.getByText("A rule prices the shop from each service's cost.")).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'New rule' }));
    const dialog = dialogOf('New retail pricing rule');
    expect(dialog.getByRole('combobox', { name: 'Applies to' })).toHaveDisplayValue('A service type');
    expect(dialog.getByRole('combobox', { name: 'Service type' })).toHaveDisplayValue('IMEI');
    expect(dialog.getByRole('textbox', { name: /^Margin/ })).toHaveValue('30');
    expect(dialog.getByRole('combobox', { name: 'Rounding' })).toHaveDisplayValue('Ends in .99');
    expect(dialog.getByRole('textbox', { name: /^Round prices from/ })).toHaveValue('5.00');
    expect(dialog.getByRole('textbox', { name: /^Follow cost changes up to/ })).toHaveValue('25');
  });

  it('starts a new rule on Every service when rules exist', async () => {
    const user = userEvent.setup();
    await openPricing();
    const dialog = await openNewRule(user);
    expect(dialog.getByRole('combobox', { name: 'Applies to' })).toHaveDisplayValue('Every service');
    expect(dialog.getByRole('textbox', { name: /^Margin/ })).toHaveValue('');
    expect(dialog.getByRole('button', { name: 'Preview' })).toBeInTheDocument();
  });
});

describe('a new rule', () => {
  it('says under the type choice what an IMEI rule covers, only once a type rule is chosen', async () => {
    const user = userEvent.setup();
    await openPricing();
    const dialog = await openNewRule(user);
    const hint =
      'A rule for IMEI covers services that take a real IMEI. Services that ask for an ECID or a serial number count as Server.';
    expect(dialog.queryByText(hint)).not.toBeInTheDocument();
    await user.selectOptions(dialog.getByRole('combobox', { name: 'Applies to' }), 'A service type');
    expect(dialog.getByText(hint)).toBeInTheDocument();
    expect(dialog.getByRole('combobox', { name: 'Service type' })).toHaveAccessibleDescription(hint);
    await user.selectOptions(dialog.getByRole('combobox', { name: 'Applies to' }), 'A category');
    expect(dialog.queryByText(hint)).not.toBeInTheDocument();
  });

  it('previews what the server says, then saves the same rule and shows it in the table', async () => {
    const user = userEvent.setup();
    await openPricing();
    const requests = recordRequests();
    const dialog = await openNewRule(user);
    await fillRemote(user, dialog);
    await user.selectOptions(dialog.getByRole('combobox', { name: 'Rounding' }), 'Ends in .99');
    await user.click(dialog.getByRole('button', { name: 'Preview' }));

    expect(await dialog.findByText('3 of 6 prices change: 2 up, 1 down')).toBeInTheDocument();
    expect(requests.last()).toMatchObject({
      method: 'POST',
      body: {
        change: {
          kind: 'create',
          rule: {
            scope: 'type',
            serviceType: 'remote',
            percent: '12.5000',
            fixed: '0.0000',
            rounding: 'ends_99',
            roundFrom: '5.0000',
            autoFollowPercent: 25,
          },
        },
      },
    });
    expect(requests.last().url.pathname).toBe('/admin/retail-price-rules/preview');
    expect(
      dialog.getByText('1 price is held at their floor: the margin is under what the floor allows.'),
    ).toBeInTheDocument();
    const lines = within(dialog.getByRole('table', { name: 'Prices this change moves' }));
    expect(lines.getAllByRole('row')).toHaveLength(4);
    const verizon = within(lines.getByText('Verizon USA Clean Unlock').closest('tr') as HTMLElement);
    expect(verizon.getByText('$11.99')).toBeInTheDocument();
    expect(verizon.getByText('At $8.31')).toBeInTheDocument();
    // The preview saved nothing.
    expect(
      requests
        .sent()
        .some((sent) => sent.method === 'POST' && sent.url.pathname.endsWith('/retail-price-rules')),
    ).toBe(false);

    await user.click(dialog.getByRole('button', { name: 'Save the rule' }));
    expect(await screen.findByText('Rule added')).toBeInTheDocument();
    expect(lastWrite(requests, 'POST')).toMatchObject({
      body: { scope: 'type', serviceType: 'remote', percent: '12.5000', rounding: 'ends_99' },
    });
    expect(lastWrite(requests, 'POST').url.pathname).toBe('/admin/retail-price-rules');
    expect(screen.queryByRole('dialog', { name: 'New retail pricing rule' })).not.toBeInTheDocument();
    const added = await rowOf(RULES, 'Remote');
    expect(added.getByText('Remote +12.5%, ends in .99')).toBeInTheDocument();
  });

  it('goes back to the settings with the values kept', async () => {
    const user = userEvent.setup();
    await openPricing();
    const dialog = await openNewRule(user);
    await fillRemote(user, dialog);
    await user.click(dialog.getByRole('button', { name: 'Preview' }));
    await dialog.findByRole('table', { name: 'Prices this change moves' });
    await user.click(dialog.getByRole('button', { name: 'Change the settings' }));
    expect(dialog.getByRole('combobox', { name: 'Service type' })).toHaveDisplayValue('Remote');
    expect(dialog.getByRole('textbox', { name: /^Margin/ })).toHaveValue('12.5');
  });

  it('checks the shape of the numbers before it asks the server, and never their range', async () => {
    const user = userEvent.setup();
    await openPricing();
    const requests = recordRequests();
    const dialog = await openNewRule(user);
    await user.click(dialog.getByRole('button', { name: 'Preview' }));
    expect(
      await dialog.findByText('Enter a margin as a number, for example 30 or 12.5.'),
    ).toBeInTheDocument();
    await user.type(dialog.getByRole('textbox', { name: /^Margin/ }), '2000');
    await user.clear(dialog.getByRole('textbox', { name: /^Follow cost changes up to/ }));
    await user.type(dialog.getByRole('textbox', { name: /^Follow cost changes up to/ }), '2.5');
    await user.click(dialog.getByRole('button', { name: 'Preview' }));
    expect(await dialog.findByText('Enter a whole number, for example 25.')).toBeInTheDocument();
    expect(requests.sent().some((sent) => sent.url.pathname.endsWith('/preview'))).toBe(false);
    // A margin of 2000 has the right shape: the server's words about its limit come back under the field.
    await user.clear(dialog.getByRole('textbox', { name: /^Follow cost changes up to/ }));
    await user.type(dialog.getByRole('textbox', { name: /^Follow cost changes up to/ }), '25');
    await user.click(dialog.getByRole('button', { name: 'Preview' }));
    expect(await dialog.findByText('The margin can be at most 1,000%.')).toBeInTheDocument();
    expect(dialog.getByRole('textbox', { name: /^Margin/ })).toHaveAttribute('aria-invalid', 'true');
  });

  it('shows the refusal of a second rule for one target under Applies to', async () => {
    const user = userEvent.setup();
    await openPricing();
    const dialog = await openNewRule(user);
    await user.selectOptions(dialog.getByRole('combobox', { name: 'Applies to' }), 'A service type');
    await user.selectOptions(dialog.getByRole('combobox', { name: 'Service type' }), 'IMEI');
    await user.type(dialog.getByRole('textbox', { name: /^Margin/ }), '10');
    await user.click(dialog.getByRole('button', { name: 'Preview' }));
    expect(await dialog.findByText('A rule for this already exists. Edit it instead.')).toBeInTheDocument();
    expect(dialog.getByRole('combobox', { name: 'Applies to' })).toHaveAttribute('aria-invalid', 'true');
    expect(dialog.getByRole('button', { name: 'Preview' })).toBeInTheDocument();
  });

  it('chooses a category by searching the server, and sends its id', async () => {
    const user = userEvent.setup();
    await openPricing();
    const requests = recordRequests();
    const dialog = await openNewRule(user);
    await user.selectOptions(dialog.getByRole('combobox', { name: 'Applies to' }), 'A category');
    await user.type(await dialog.findByRole('searchbox', { name: 'Search categories' }), 'sams');
    await dialog.findByRole('option', { name: 'Samsung' });
    await waitFor(() => expect(dialog.queryByRole('option', { name: 'Apple' })).not.toBeInTheDocument());
    expect(
      requests
        .sent()
        .some(
          (sent) =>
            sent.url.pathname.endsWith('/admin/service-categories') &&
            sent.url.searchParams.get('q') === 'sams',
        ),
    ).toBe(true);
    await user.selectOptions(dialog.getByRole('combobox', { name: 'Category' }), 'Samsung');
    await user.type(dialog.getByRole('textbox', { name: /^Margin/ }), '40');
    await user.click(dialog.getByRole('button', { name: 'Preview' }));
    await dialog.findByRole('table', { name: 'Prices this change moves' });
    expect(requests.last().body).toMatchObject({
      change: { kind: 'create', rule: { scope: 'category', categoryId: 2, percent: '40.0000' } },
    });
  });

  it('asks for a category before it sends anything', async () => {
    const user = userEvent.setup();
    await openPricing();
    const dialog = await openNewRule(user);
    await user.selectOptions(dialog.getByRole('combobox', { name: 'Applies to' }), 'A category');
    await user.type(dialog.getByRole('textbox', { name: /^Margin/ }), '40');
    await user.click(dialog.getByRole('button', { name: 'Preview' }));
    expect(await dialog.findByText('Choose a category.')).toBeInTheDocument();
  });

  it('shows a note when the server says the figures cover only part of the services, and when nothing would change', async () => {
    const user = userEvent.setup();
    mockServer.use(
      http.post('*/admin/retail-price-rules/preview', () =>
        HttpResponse.json({
          following: 2500,
          changes: 0,
          raised: 0,
          lowered: 0,
          atFloor: 0,
          noRule: 4,
          lines: [],
          truncated: true,
        }),
      ),
    );
    await openPricing();
    const dialog = await openNewRule(user);
    await fillRemote(user, dialog);
    await user.click(dialog.getByRole('button', { name: 'Preview' }));
    expect(await dialog.findByText('0 of 2,500 prices change: 0 up, 0 down')).toBeInTheDocument();
    expect(dialog.getByText(/cover only the first part of them/)).toBeInTheDocument();
    expect(dialog.getByText('4 services have no rule left and keep the current price.')).toBeInTheDocument();
    expect(dialog.getByText('No price would change.')).toBeInTheDocument();
  });
});

describe('editing a rule', () => {
  it('fixes what it covers, previews and saves only the figure that changed', async () => {
    const user = userEvent.setup();
    await openPricing();
    const requests = recordRequests();
    await user.click(
      (await rowOf(RULES, 'IMEI')).getByRole('button', { name: 'Edit the rule for IMEI services' }),
    );
    const dialog = dialogOf('Edit retail pricing rule');
    expect(dialog.getByRole('combobox', { name: 'Applies to' })).toBeDisabled();
    expect(dialog.getByRole('combobox', { name: 'Service type' })).toBeDisabled();
    expect(dialog.getByRole('textbox', { name: /^Margin/ })).toHaveValue('30');
    expect(dialog.getByRole('textbox', { name: /^Plus a fixed amount/ })).toHaveValue('0.00');

    await user.click(dialog.getByRole('button', { name: 'Preview' }));
    expect(await dialog.findByText('Nothing changed.')).toBeInTheDocument();
    expect(requests.sent().some((sent) => sent.url.pathname.endsWith('/preview'))).toBe(false);

    await user.clear(dialog.getByRole('textbox', { name: /^Margin/ }));
    await user.type(dialog.getByRole('textbox', { name: /^Margin/ }), '35');
    await user.click(dialog.getByRole('button', { name: 'Preview' }));
    await dialog.findByRole('table', { name: 'Prices this change moves' });
    expect(requests.last().body).toEqual({ change: { kind: 'update', id: 2, rule: { percent: '35.0000' } } });
    await user.click(dialog.getByRole('button', { name: 'Save the rule' }));
    expect(await screen.findByText('Rule saved')).toBeInTheDocument();
    expect(lastWrite(requests, 'PATCH')).toMatchObject({ body: { percent: '35.0000' } });
    expect(lastWrite(requests, 'PATCH').url.pathname).toBe('/admin/retail-price-rules/2');
    expect(await (await rowOf(RULES, 'IMEI')).findByText('IMEI +35%')).toBeInTheDocument();
  });
});

describe('turning a rule off or on and deleting it', () => {
  it('turns a rule off after the server’s preview, and shows it Off', async () => {
    const user = userEvent.setup();
    await openPricing();
    const requests = recordRequests();
    await user.click(
      (await rowOf(RULES, 'Carrier unlock')).getByRole('button', {
        name: 'Turn off the rule for Carrier unlock',
      }),
    );
    const dialog = dialogOf('Turn this rule off?');
    expect(await dialog.findByText('4 of 4 prices change: 4 up, 0 down')).toBeInTheDocument();
    expect(requests.last().body).toEqual({ change: { kind: 'update', id: 3, rule: { isActive: false } } });
    expect(dialog.getByText(/move to the next rule that covers them/)).toBeInTheDocument();
    await user.click(dialog.getByRole('button', { name: 'Turn rule off' }));
    expect(await screen.findByText('Rule turned off')).toBeInTheDocument();
    expect(lastWrite(requests, 'PATCH')).toMatchObject({ body: { isActive: false } });
    expect(await (await rowOf(RULES, 'Carrier unlock')).findByText('Off')).toBeInTheDocument();
  });

  it('turns a rule on after a preview of what it would move', async () => {
    const user = userEvent.setup();
    await openPricing();
    await user.click(
      (await rowOf(RULES, 'Server')).getByRole('button', { name: 'Turn on the rule for Server services' }),
    );
    const dialog = dialogOf('Turn this rule on?');
    expect(await dialog.findByText('3 of 6 prices change: 2 up, 1 down')).toBeInTheDocument();
    await user.click(dialog.getByRole('button', { name: 'Turn rule on' }));
    expect(await screen.findByText('Rule turned on')).toBeInTheDocument();
    expect(await (await rowOf(RULES, 'Server')).findByText('On')).toBeInTheDocument();
  });

  it('deletes the last rule only after it says the prices keep what they have', async () => {
    const user = userEvent.setup();
    await openPricing();
    const requests = recordRequests();
    await user.click(
      (await rowOf(RULES, 'Every service')).getByRole('button', {
        name: 'Delete the rule for every service',
      }),
    );
    const dialog = dialogOf('Delete this rule?');
    expect(await dialog.findByText('0 of 3 prices change: 0 up, 0 down')).toBeInTheDocument();
    expect(dialog.getByText('3 services have no rule left and keep the current price.')).toBeInTheDocument();
    await user.click(dialog.getByRole('button', { name: 'Delete rule' }));
    expect(await screen.findByText('Rule deleted')).toBeInTheDocument();
    expect(lastWrite(requests, 'DELETE').url.pathname).toBe('/admin/retail-price-rules/1');
    await waitFor(async () => expect((await tableNamed(RULES)).getAllByRole('row')).toHaveLength(4));
  });

  it('says so when the preview did not load, and writes nothing', async () => {
    const user = userEvent.setup();
    mockServer.use(
      http.post('*/admin/retail-price-rules/preview', () =>
        problem(500, 'INTERNAL', 'Server error', 'The preview could not be worked out.'),
      ),
    );
    await openPricing();
    const requests = recordRequests();
    await user.click(
      (await rowOf(RULES, 'IMEI')).getByRole('button', { name: 'Delete the rule for IMEI services' }),
    );
    const dialog = dialogOf('Delete this rule?');
    expect(await dialog.findByText('The preview could not be worked out.')).toBeInTheDocument();
    await user.click(dialog.getByRole('button', { name: 'Delete rule' }));
    expect(
      await dialog.findByText('The preview did not load. Close this window and try again.'),
    ).toBeInTheDocument();
    expect(requests.sent().some((sent) => sent.method === 'DELETE')).toBe(false);
  });
});

describe('the permissions of the rules', () => {
  it('lets a role with pricing:read see the rules and nothing else, and says which permission each button needs', async () => {
    await openPricing({ permissions: ['pricing:read'] });
    const carrier = await rowOf(RULES, 'Carrier unlock');
    for (const [name, permission] of [
      ['Edit the rule for Carrier unlock', 'pricing:update'],
      ['Turn off the rule for Carrier unlock', 'pricing:update'],
      ['Delete the rule for Carrier unlock', 'pricing:delete'],
    ] as const) {
      const button = carrier.getByRole('button', { name });
      expect(button).toBeDisabled();
      expect(button).toHaveAttribute('title', `You need the ${permission} permission`);
    }
    expect(screen.getByRole('button', { name: 'New rule' })).toBeDisabled();
  });

  it('enables each button with its own permission', async () => {
    await openPricing({ permissions: ['pricing:read', 'pricing:create', 'pricing:update'] });
    const carrier = await rowOf(RULES, 'Carrier unlock');
    expect(carrier.getByRole('button', { name: 'Edit the rule for Carrier unlock' })).toBeEnabled();
    expect(carrier.getByRole('button', { name: 'Delete the rule for Carrier unlock' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'New rule' })).toBeEnabled();
  });
});
