// Tests for the Plans tab, run through the whole app against the dev mock API: the list with kind, rate, conditions and agent counts,
// New plan and Edit (only what changed is sent), the form's own checks, the server's field messages, and Delete with its refusal for a
// plan that agents are still assigned to.
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { setupMockApi } from '@/test/renderApp';
import { listPlans } from '../api';
import { dialogOf, openCommissions, tableNamed } from '../test/commissionsPage';
import { recordRequests } from '../test/requests';

setupMockApi();
vi.setConfig({ testTimeout: 20_000 });
afterEach(() => vi.restoreAllMocks());

const PLANS = '/commissions?tab=plans';
/** The row of a plan, found by its Edit button (a plan's name can also be another plan's kind tag). */
async function planRow(name: string) {
  const table = await tableNamed('Commission plans');
  const row = (await table.findByRole('button', { name: `Edit ${name} plan` })).closest('tr');
  if (!row) throw new Error(`No row for the ${name} plan.`);
  return within(row);
}

/** The plan requests of a recording (the sign-in calls are left out). */
const sentPlans = (requests: ReturnType<typeof recordRequests>) =>
  requests.sent().filter((request) => request.url.pathname.startsWith('/admin/commission-plans'));

describe('the list', () => {
  it('lists the plans with kind, rate, what they are paid on, period, conditions and agents', async () => {
    await openCommissions(PLANS);
    const referral = await planRow('Referral');
    expect(referral.getAllByText('Referral')).toHaveLength(2); // the name and the kind tag
    expect(referral.getByText('3%')).toBeInTheDocument();
    expect(referral.getByText('Order revenue of referred merchants')).toBeInTheDocument();
    expect(referral.getByText('monthly')).toBeInTheDocument();
    expect(referral.getByText('minPayout: 50.0000')).toBeInTheDocument();
    expect(referral.getByText('Active')).toBeInTheDocument();
    const partner = await planRow('Partner');
    expect(partner.getByText('5%')).toBeInTheDocument();
    expect(partner.getByText('minPayout: 100.0000, minReferrals: 3')).toBeInTheDocument();
    const rebate = await planRow('Volume rebate');
    expect(rebate.getByText('Rebate')).toBeInTheDocument();
    expect(rebate.getByText('brackets: 2 items')).toBeInTheDocument();
    expect(
      screen.getByText(/A rate change applies to orders completed after you save it\./),
    ).toBeInTheDocument();
  });

  it('counts the agents on each plan', async () => {
    await openCommissions(PLANS);
    const cells = async (name: string) =>
      (await planRow(name)).getAllByRole('cell').map((cell) => cell.textContent);
    // Plan, rate, paid on, period, conditions, agents, status, actions.
    await waitFor(async () => expect((await cells('Referral'))[5]).toBe('1'));
    expect((await cells('Partner'))[5]).toBe('1');
    expect((await cells('Volume rebate'))[5]).toBe('0');
  });
});

describe('New plan', () => {
  it('creates a plan with its conditions and shows it in the list', async () => {
    const user = userEvent.setup();
    const requests = recordRequests();
    await openCommissions(PLANS);
    await user.click(await screen.findByRole('button', { name: 'New plan' }));
    const dialog = dialogOf('New plan');
    await user.type(dialog.getByRole('textbox', { name: 'Name' }), 'Gold');
    await user.selectOptions(dialog.getByRole('combobox', { name: 'Kind' }), 'rebate');
    await user.type(dialog.getByRole('textbox', { name: 'Rate (%)' }), '4.5');
    await user.type(dialog.getByRole('textbox', { name: 'Paid on' }), 'Order revenue');
    await user.type(dialog.getByRole('textbox', { name: 'Period' }), 'monthly');
    await user.type(dialog.getByRole('textbox', { name: 'Conditions' }), '{{"minPayout": "25"}');
    await user.click(dialog.getByRole('button', { name: 'Create plan' }));

    expect(await screen.findByText('Gold plan created')).toBeInTheDocument();
    expect(sentPlans(requests).find((request) => request.method === 'POST')?.body).toEqual({
      name: 'Gold',
      kind: 'rebate',
      percent: '4.5',
      basis: 'Order revenue',
      period: 'monthly',
      tiers: { minPayout: '25' },
      isActive: true,
    });
    const row = await planRow('Gold');
    expect(row.getByText('4.5%')).toBeInTheDocument();
    expect(row.getByText('minPayout: 25')).toBeInTheDocument();
    expect(row.getByText('Rebate')).toBeInTheDocument();
  });

  it('checks the form before it sends anything', async () => {
    const user = userEvent.setup();
    const requests = recordRequests();
    await openCommissions(PLANS);
    await user.click(await screen.findByRole('button', { name: 'New plan' }));
    const dialog = dialogOf('New plan');
    await user.type(dialog.getByRole('textbox', { name: 'Rate (%)' }), '120');
    await user.type(dialog.getByRole('textbox', { name: 'Conditions' }), '[[1, 2]');
    await user.click(dialog.getByRole('button', { name: 'Create plan' }));
    expect(await dialog.findByText('Enter a name.')).toBeInTheDocument();
    expect(dialog.getByText('Enter a rate between 0 and 100, for example 3.5.')).toBeInTheDocument();
    expect(dialog.getByText('Enter what the rate is paid on.')).toBeInTheDocument();
    expect(dialog.getByText('Enter the period.')).toBeInTheDocument();
    expect(sentPlans(requests).some((request) => request.method === 'POST')).toBe(false);
  });

  it('refuses conditions that are not a JSON object, under the field', async () => {
    const user = userEvent.setup();
    await openCommissions(PLANS);
    await user.click(await screen.findByRole('button', { name: 'New plan' }));
    const dialog = dialogOf('New plan');
    await user.type(dialog.getByRole('textbox', { name: 'Name' }), 'Gold');
    await user.type(dialog.getByRole('textbox', { name: 'Rate (%)' }), '4');
    await user.type(dialog.getByRole('textbox', { name: 'Paid on' }), 'Order revenue');
    await user.type(dialog.getByRole('textbox', { name: 'Period' }), 'monthly');
    await user.type(dialog.getByRole('textbox', { name: 'Conditions' }), 'not json');
    await user.click(dialog.getByRole('button', { name: 'Create plan' }));
    expect(await dialog.findByText(/Enter the conditions as a JSON object/)).toBeInTheDocument();
    expect(dialog.getByRole('textbox', { name: 'Conditions' })).toHaveAttribute('aria-invalid', 'true');
    expect((await listPlans()).total).toBe(3);
  });

  it('puts the server’s message about the rate under the field', async () => {
    const user = userEvent.setup();
    await openCommissions(PLANS);
    await user.click(await screen.findByRole('button', { name: 'New plan' }));
    const dialog = dialogOf('New plan');
    await user.type(dialog.getByRole('textbox', { name: 'Name' }), 'Gold');
    await user.type(dialog.getByRole('textbox', { name: 'Rate (%)' }), '40');
    await user.type(dialog.getByRole('textbox', { name: 'Paid on' }), 'Order revenue');
    await user.type(dialog.getByRole('textbox', { name: 'Period' }), 'monthly');
    await user.click(dialog.getByRole('button', { name: 'Create plan' }));
    expect(await dialog.findByText('Enter a rate between 0.5 and 15.')).toBeInTheDocument();
    expect(dialog.getByRole('textbox', { name: 'Rate (%)' })).toHaveAttribute('aria-invalid', 'true');
  });
});

describe('Edit', () => {
  it('opens with the plan’s values and sends only the rate when only the rate changed', async () => {
    const user = userEvent.setup();
    const requests = recordRequests();
    await openCommissions(PLANS);
    await user.click((await planRow('Referral')).getByRole('button', { name: 'Edit Referral plan' }));
    const dialog = dialogOf('Edit Referral plan');
    expect(dialog.getByText('Currently 3% of order revenue of referred merchants')).toBeInTheDocument();
    expect(dialog.getByRole('textbox', { name: 'Name' })).toHaveValue('Referral');
    expect(dialog.getByRole('textbox', { name: 'Rate (%)' })).toHaveValue('3');
    expect(dialog.getByRole('combobox', { name: 'Kind' })).toHaveValue('referral');
    expect(dialog.getByRole('textbox', { name: 'Conditions' })).toHaveValue('{\n  "minPayout": "50.0000"\n}');
    const rate = dialog.getByRole('textbox', { name: 'Rate (%)' });
    await user.clear(rate);
    await user.type(rate, '3.5');
    await user.click(dialog.getByRole('button', { name: 'Save plan' }));

    expect(await screen.findByText('Referral plan updated')).toBeInTheDocument();
    const patch = sentPlans(requests).find((request) => request.method === 'PATCH');
    expect(patch?.url.pathname).toBe('/admin/commission-plans/1');
    expect(patch?.body).toEqual({ percent: '3.5' });
    await waitFor(async () => expect((await planRow('Referral')).getByText('3.5%')).toBeInTheDocument());
  });

  it('sends nothing when nothing changed', async () => {
    const user = userEvent.setup();
    const requests = recordRequests();
    await openCommissions(PLANS);
    await user.click((await planRow('Partner')).getByRole('button', { name: 'Edit Partner plan' }));
    await user.click(dialogOf('Edit Partner plan').getByRole('button', { name: 'Save plan' }));
    expect(await screen.findByText('Nothing changed')).toBeInTheDocument();
    expect(sentPlans(requests).some((request) => request.method === 'PATCH')).toBe(false);
  });

  it('switches a plan off and shows it as off', async () => {
    const user = userEvent.setup();
    const requests = recordRequests();
    await openCommissions(PLANS);
    await user.click(
      (await planRow('Volume rebate')).getByRole('button', { name: 'Edit Volume rebate plan' }),
    );
    const dialog = dialogOf('Edit Volume rebate plan');
    await user.click(dialog.getByRole('checkbox', { name: 'Active' }));
    await user.click(dialog.getByRole('button', { name: 'Save plan' }));
    await screen.findByText('Volume rebate plan updated');
    expect(sentPlans(requests).find((request) => request.method === 'PATCH')?.body).toEqual({
      isActive: false,
    });
    await waitFor(async () => expect((await planRow('Volume rebate')).getByText('Off')).toBeInTheDocument());
  });

  it('shows the server’s message when the new rate is outside its range', async () => {
    const user = userEvent.setup();
    await openCommissions(PLANS);
    await user.click((await planRow('Referral')).getByRole('button', { name: 'Edit Referral plan' }));
    const dialog = dialogOf('Edit Referral plan');
    const rate = dialog.getByRole('textbox', { name: 'Rate (%)' });
    await user.clear(rate);
    await user.type(rate, '30');
    await user.click(dialog.getByRole('button', { name: 'Save plan' }));
    expect(await dialog.findByText('Enter a rate between 0.5 and 15.')).toBeInTheDocument();
  });
});

describe('Delete', () => {
  it('deletes a plan nobody is on', async () => {
    const user = userEvent.setup();
    await openCommissions(PLANS);
    await user.click(
      (await planRow('Volume rebate')).getByRole('button', { name: 'Delete Volume rebate plan' }),
    );
    const dialog = dialogOf('Delete Volume rebate plan?');
    await user.click(dialog.getByRole('button', { name: 'Delete plan' }));
    expect(await screen.findByText('Volume rebate plan deleted')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByText('Volume rebate')).not.toBeInTheDocument());
    expect((await listPlans()).total).toBe(2);
  });

  it('keeps the dialog open with the server’s message for a plan that agents are assigned to', async () => {
    const user = userEvent.setup();
    await openCommissions(PLANS);
    await user.click((await planRow('Referral')).getByRole('button', { name: 'Delete Referral plan' }));
    const dialog = dialogOf('Delete Referral plan?');
    await user.click(dialog.getByRole('button', { name: 'Delete plan' }));
    expect(
      await dialog.findByText(
        'The Referral plan is assigned to 1 agent. End or move those assignments first.',
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole('dialog', { name: 'Delete Referral plan?' })).toBeInTheDocument();
    expect((await listPlans()).total).toBe(3);
    await user.click(dialog.getByRole('button', { name: 'Cancel' }));
    expect((await planRow('Referral')).getByText('3%')).toBeInTheDocument();
  });
});
