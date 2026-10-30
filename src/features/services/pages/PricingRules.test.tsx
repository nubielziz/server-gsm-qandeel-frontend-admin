// Tests for the Rules and groups tab, run through the whole app against the dev mock API: the merchant groups (read-only, with a link to
// the merchants page), the pricing rules table with New rule, Edit, Turn off and Delete, the server's refusals, and the notes.
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fmtDay } from '@/lib/format';
import { mockServer } from '@/mocks/node';
import { problem } from '@/mocks/problem';
import { setupMockApi } from '@/test/renderApp';
import { getPricingRule, listPricingRules } from '../api';
import { groupHandlers } from '../mocks/testGroups';
import { dialogOf, openServices } from '../test/servicesPage';

setupMockApi();
vi.setConfig({ testTimeout: 20_000 });
// The merchants feature serves the group list; these tests bring their own copy of it.
beforeEach(() => mockServer.use(...groupHandlers));

const RULES = '/services?tab=rules';
const START = new Date(2026, 2, 5);
const END = new Date(2026, 2, 20);

/** The row of the pricing rules table that holds some text. */
async function ruleRow(text: string) {
  const table = within(await screen.findByRole('table', { name: 'Pricing rules' }));
  return within((await table.findByText(text)).closest('tr') as HTMLElement);
}

describe('merchant groups', () => {
  it('lists the groups with their discount and merchants, read-only, and links to where they are managed', async () => {
    await openServices(RULES);
    const table = within(await screen.findByRole('table', { name: 'Price groups' }));
    expect(
      within(table.getByText('Standard').closest('tr') as HTMLElement).getByText('None'),
    ).toBeInTheDocument();
    const wholesale = within(table.getByText('Wholesale').closest('tr') as HTMLElement);
    expect(wholesale.getByText('-4%')).toBeInTheDocument();
    expect(wholesale.getByText('6')).toBeInTheDocument();
    expect(within(table.getByText('VIP').closest('tr') as HTMLElement).getByText('-8%')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Manage groups' })).toHaveAttribute(
      'href',
      '/merchants?tab=groups',
    );
  });

  it('needs groups:read to show the groups', async () => {
    await openServices(RULES, { permissions: ['pricing:read'] });
    expect(
      await screen.findByText('You need the groups:read permission to see the merchant groups.'),
    ).toBeInTheDocument();
  });
});

describe('the rules table', () => {
  it('shows the demo’s Carrier unlock promo as a discount rule', async () => {
    await openServices(RULES);
    const row = await ruleRow('Carrier unlock (category)');
    expect(row.getByText('Discount')).toBeInTheDocument();
    expect(row.getByText('−2%')).toBeInTheDocument();
    expect(row.getByText('priority 100')).toBeInTheDocument();
    expect(row.getByText('On')).toBeInTheDocument();
    expect(screen.getByText('Floor policy')).toBeInTheDocument();
    expect(screen.getByText(/Set a group price from the row menu of a service/)).toBeInTheDocument();
  });

  it('turns a rule off and back on without losing it', async () => {
    const user = userEvent.setup();
    await openServices(RULES);
    const row = await ruleRow('Carrier unlock (category)');
    await user.click(row.getByRole('button', { name: 'Turn off rule 1' }));
    expect(await screen.findByText('Rule turned off')).toBeInTheDocument();
    expect(screen.getByText('New orders use the base price.')).toBeInTheDocument();
    expect((await getPricingRule(1)).isActive).toBe(false);
    const off = await ruleRow('Carrier unlock (category)');
    await waitFor(() => expect(off.getByText('Off')).toBeInTheDocument());
    await user.click(off.getByRole('button', { name: 'Turn on rule 1' }));
    expect(await screen.findByText('Rule turned on')).toBeInTheDocument();
    expect((await getPricingRule(1)).isActive).toBe(true);
  });

  it('deletes a rule after a review step', async () => {
    const user = userEvent.setup();
    await openServices(RULES);
    const row = await ruleRow('Carrier unlock (category)');
    await user.click(row.getByRole('button', { name: 'Delete rule 1' }));
    const dialog = dialogOf('Delete this rule?');
    expect(
      dialog.getByText(/The discount rule for Carrier unlock \(category\) is removed\./),
    ).toBeInTheDocument();
    await user.click(dialog.getByRole('button', { name: 'Delete rule' }));
    expect(await screen.findByText('Rule removed')).toBeInTheDocument();
    expect(await screen.findByText('No pricing rules')).toBeInTheDocument();
    expect((await listPricingRules()).total).toBe(0);
  });
});

describe('New rule and Edit rule', () => {
  async function openNewRule(user: ReturnType<typeof userEvent.setup>) {
    await user.click(await screen.findByRole('button', { name: 'New rule' }));
    const dialog = dialogOf('New rule');
    await dialog.findByRole('option', { name: 'Credits' });
    return dialog;
  }

  it('adds a promo for a category with dates', async () => {
    const user = userEvent.setup();
    await openServices(RULES);
    const dialog = await openNewRule(user);
    await user.selectOptions(dialog.getByRole('combobox', { name: 'Category' }), 'Credits');
    await user.selectOptions(dialog.getByRole('combobox', { name: 'Type' }), 'Promo (a discount for a time)');
    await user.type(dialog.getByRole('textbox', { name: 'Percentage' }), '5');
    await user.type(dialog.getByLabelText('Starts'), '2026-03-05');
    await user.type(dialog.getByLabelText('Ends'), '2026-03-20');
    await user.click(dialog.getByRole('button', { name: 'Add rule' }));
    expect(await screen.findByText('Rule added')).toBeInTheDocument();
    const row = await ruleRow('Credits (category)');
    expect(row.getByText('Promo')).toBeInTheDocument();
    expect(row.getByText('−5%')).toBeInTheDocument();
    expect(row.getByText(`From ${fmtDay(START)} to ${fmtDay(END)}`)).toBeInTheDocument();
    const rules = (await listPricingRules()).data;
    expect(rules.at(-1)).toMatchObject({
      scope: 'category',
      kind: 'promo',
      percent: '5.0000',
      fixed: '0.0000',
      // Whole calendar days of the browser's time zone.
      startsAt: new Date(2026, 2, 5, 0, 0, 0, 0).toISOString(),
      endsAt: new Date(2026, 2, 20, 23, 59, 59, 999).toISOString(),
    });
  });

  it('adds a margin rule for one merchant group with a fixed amount and rounding', async () => {
    const user = userEvent.setup();
    await openServices(RULES);
    const dialog = await openNewRule(user);
    await user.selectOptions(dialog.getByRole('combobox', { name: 'Applies to' }), 'Every service');
    expect(dialog.queryByRole('combobox', { name: 'Category' })).not.toBeInTheDocument();
    await user.selectOptions(dialog.getByRole('combobox', { name: 'Type' }), 'Margin (adds to the price)');
    await user.selectOptions(dialog.getByRole('combobox', { name: 'Merchant group' }), 'Wholesale');
    await user.type(dialog.getByRole('textbox', { name: 'Fixed amount (USD)' }), '0.50');
    await user.selectOptions(dialog.getByRole('combobox', { name: 'Rounding' }), 'Nearest $0.05');
    await user.click(dialog.getByRole('button', { name: 'Add rule' }));
    expect(await screen.findByText('Rule added')).toBeInTheDocument();
    const row = await ruleRow('Every service');
    expect(row.getByText('+$0.50')).toBeInTheDocument();
    expect(row.getByText('Wholesale group only')).toBeInTheDocument();
    expect(row.getByText(/Nearest \$0\.05/)).toBeInTheDocument();
  });

  it('asks for an adjustment and a target before it calls the server', async () => {
    const user = userEvent.setup();
    await openServices(RULES);
    const dialog = await openNewRule(user);
    await user.click(dialog.getByRole('button', { name: 'Add rule' }));
    expect(await dialog.findByText('Choose the category.')).toBeInTheDocument();
    await user.selectOptions(dialog.getByRole('combobox', { name: 'Category' }), 'Credits');
    await user.click(dialog.getByRole('button', { name: 'Add rule' }));
    expect(await dialog.findByText('Enter a percent or a fixed amount.')).toBeInTheDocument();
    await user.type(dialog.getByRole('textbox', { name: 'Percentage' }), '5');
    await user.type(dialog.getByLabelText('Starts'), '2026-03-20');
    await user.type(dialog.getByLabelText('Ends'), '2026-03-05');
    await user.click(dialog.getByRole('button', { name: 'Add rule' }));
    expect(await dialog.findByText('The end date is before the start date.')).toBeInTheDocument();
    expect((await listPricingRules()).total).toBe(1);
  });

  it('shows the server’s words under the field it names', async () => {
    const user = userEvent.setup();
    await openServices(RULES);
    mockServer.use(
      http.post('*/admin/pricing-rules', () =>
        problem(422, 'VALIDATION_FAILED', 'Check the form', 'Some fields need attention.', [
          { field: 'percent', message: 'A promo cannot be more than 30%.' },
        ]),
      ),
    );
    const dialog = await openNewRule(user);
    await user.selectOptions(dialog.getByRole('combobox', { name: 'Category' }), 'Credits');
    await user.type(dialog.getByRole('textbox', { name: 'Percentage' }), '90');
    await user.click(dialog.getByRole('button', { name: 'Add rule' }));
    expect(await dialog.findByText('A promo cannot be more than 30%.')).toBeInTheDocument();
    expect(dialog.getByRole('textbox', { name: 'Percentage' })).toHaveAttribute('aria-invalid', 'true');
  });

  it('shows the server’s messages under the type, the merchant group and the rounding', async () => {
    const user = userEvent.setup();
    mockServer.use(
      http.post('*/admin/pricing-rules', () =>
        problem(422, 'VALIDATION_FAILED', 'Check the form', 'Some fields need attention.', [
          { field: 'kind', message: 'Promos need dates.' },
          { field: 'groupId', message: 'That group has no rules.' },
          { field: 'rounding', message: 'That rounding is not offered.' },
        ]),
      ),
    );
    await openServices(RULES);
    const dialog = await openNewRule(user);
    await user.selectOptions(dialog.getByRole('combobox', { name: 'Category' }), 'Credits');
    await user.type(dialog.getByRole('textbox', { name: 'Percentage' }), '5');
    await user.click(dialog.getByRole('button', { name: 'Add rule' }));
    expect(await dialog.findByText('Promos need dates.')).toBeInTheDocument();
    expect(dialog.getByRole('combobox', { name: 'Type' })).toHaveAttribute('aria-invalid', 'true');
    expect(dialog.getByText('That group has no rules.')).toBeInTheDocument();
    expect(dialog.getByRole('combobox', { name: 'Merchant group' })).toHaveAttribute('aria-invalid', 'true');
    expect(dialog.getByText('That rounding is not offered.')).toBeInTheDocument();
    expect(dialog.getByRole('combobox', { name: 'Rounding' })).toHaveAttribute('aria-invalid', 'true');
  });

  it('puts a message about the target of a rule on every service in the error slot, as it has no menu', async () => {
    const user = userEvent.setup();
    mockServer.use(
      http.post('*/admin/pricing-rules', () =>
        problem(422, 'VALIDATION_FAILED', 'Check the form', 'Some fields need attention.', [
          { field: 'targetId', message: 'A global rule has no target.' },
        ]),
      ),
    );
    await openServices(RULES);
    const dialog = await openNewRule(user);
    await user.selectOptions(dialog.getByRole('combobox', { name: 'Applies to' }), 'Every service');
    await user.type(dialog.getByRole('textbox', { name: 'Percentage' }), '5');
    await user.click(dialog.getByRole('button', { name: 'Add rule' }));
    expect(await dialog.findByRole('alert')).toHaveTextContent('targetId: A global rule has no target.');
  });

  it('says so, with a Retry, when the groups or the categories could not be loaded', async () => {
    const user = userEvent.setup();
    mockServer.use(
      http.get('*/admin/client-groups', () => problem(403, 'FORBIDDEN', 'No access', 'Groups are closed.')),
      http.get('*/admin/service-categories', () => problem(403, 'FORBIDDEN', 'No access', 'Closed.'), {
        once: true,
      }),
    );
    await openServices(RULES);
    await user.click(await screen.findByRole('button', { name: 'New rule' }));
    const dialog = dialogOf('New rule');
    expect(await dialog.findByText(/Could not load merchant groups\./)).toBeInTheDocument();
    expect(await dialog.findByText(/Could not load the categories\./)).toBeInTheDocument();
    // Retry on the categories works (the first answer was the only refusal); the groups stay refused.
    await user.click(
      within(dialog.getByText(/Could not load the categories\./)).getByRole('button', { name: 'Retry' }),
    );
    expect(await dialog.findByRole('option', { name: 'Credits' })).toBeInTheDocument();
    expect(dialog.queryByText(/Could not load the categories/)).not.toBeInTheDocument();
    expect(dialog.getByText(/Could not load merchant groups\./)).toBeInTheDocument();
  });

  it('edits a rule, sending only the field that changed', async () => {
    const user = userEvent.setup();
    await openServices(RULES);
    const row = await ruleRow('Carrier unlock (category)');
    await user.click(row.getByRole('button', { name: 'Edit rule 1' }));
    const dialog = dialogOf('Edit rule');
    expect(await dialog.findByRole('textbox', { name: 'Percentage' })).toHaveValue('2');
    await user.clear(dialog.getByRole('textbox', { name: 'Percentage' }));
    await user.type(dialog.getByRole('textbox', { name: 'Percentage' }), '3');
    await user.click(dialog.getByRole('button', { name: 'Save rule' }));
    expect(await screen.findByText('Rule saved')).toBeInTheDocument();
    expect(await getPricingRule(1)).toMatchObject({ percent: '3.0000', kind: 'discount', priority: 100 });
    expect(await (await ruleRow('Carrier unlock (category)')).findByText('−3%')).toBeInTheDocument();
  });

  it('keeps the rule’s category chosen, and clears it when the rule is made to cover a service', async () => {
    const user = userEvent.setup();
    await openServices(RULES);
    const row = await ruleRow('Carrier unlock (category)');
    await user.click(row.getByRole('button', { name: 'Edit rule 1' }));
    const dialog = dialogOf('Edit rule');
    await dialog.findByRole('option', { name: 'Credits' });
    expect(dialog.getByRole('combobox', { name: 'Category' })).toHaveDisplayValue('Carrier unlock');
    await user.selectOptions(dialog.getByRole('combobox', { name: 'Applies to' }), 'One service');
    expect(dialog.getByRole('combobox', { name: 'Service' })).toHaveDisplayValue('Choose a service');
    await user.click(dialog.getByRole('button', { name: 'Save rule' }));
    expect(await dialog.findByText('Choose the service.')).toBeInTheDocument();
    expect((await getPricingRule(1)).scope).toBe('category');
  });

  it('says so when nothing changed', async () => {
    const user = userEvent.setup();
    await openServices(RULES);
    const row = await ruleRow('Carrier unlock (category)');
    await user.click(row.getByRole('button', { name: 'Edit rule 1' }));
    await user.click(dialogOf('Edit rule').getByRole('button', { name: 'Save rule' }));
    expect(await screen.findByText('Nothing changed')).toBeInTheDocument();
  });
});

describe('permissions', () => {
  it('lets a reader see the rules but not change them', async () => {
    await openServices(RULES, { permissions: ['pricing:read', 'groups:read'] });
    const row = await ruleRow('Carrier unlock (category)');
    expect(row.getByRole('button', { name: 'Edit rule 1' })).toBeDisabled();
    expect(row.getByRole('button', { name: 'Turn off rule 1' })).toBeDisabled();
    expect(row.getByRole('button', { name: 'Delete rule 1' })).toBeDisabled();
    const create = screen.getByRole('button', { name: 'New rule' });
    expect(create).toBeDisabled();
    expect(create).toHaveAttribute('title', 'You need the pricing:create permission');
  });
});
