// Tests for the Agents tab, run through the whole app against the dev mock API: the agents with their plan and start, the links to the
// merchant and to their accruals, Assign plan, Change plan and End, and the server's refusals.
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http } from 'msw';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mockServer } from '@/mocks/node';
import { problem } from '@/mocks/problem';
import { setupMockApi } from '@/test/renderApp';
import { listAssignments } from '../api';
import { dialogOf, openCommissions, rowOf, tableNamed } from '../test/commissionsPage';
import { recordRequests } from '../test/requests';

setupMockApi();
vi.setConfig({ testTimeout: 20_000 });
afterEach(() => vi.restoreAllMocks());

const AGENTS = '/commissions?tab=agents';
const agentRow = (name: string) => rowOf('Agents', name);

describe('the list', () => {
  it('lists the merchants on a plan with the plan, its rate, since when and the scope', async () => {
    await openCommissions(AGENTS);
    const zain = await agentRow('Zain Mobile Hub');
    expect(zain.getByText('JO')).toBeInTheDocument();
    expect(zain.getByText('Referral')).toBeInTheDocument();
    expect(zain.getByText('3%')).toBeInTheDocument();
    expect(zain.getByText('referrals')).toBeInTheDocument();
    const cairo = await agentRow('Cairo GSM Lab');
    expect(cairo.getByText('Partner')).toBeInTheDocument();
    expect(cairo.getByText('5%')).toBeInTheDocument();
    const table = await tableNamed('Agents');
    expect(table.getAllByRole('row')).toHaveLength(3);
    expect(screen.getByText('2 rows')).toBeInTheDocument();
  });

  it('links the agent to the merchant’s page', async () => {
    await openCommissions(AGENTS);
    const zain = await agentRow('Zain Mobile Hub');
    expect(zain.getByRole('link', { name: 'Zain Mobile Hub' })).toHaveAttribute('href', '/merchants/1');
    expect((await agentRow('Cairo GSM Lab')).getByRole('link', { name: 'Cairo GSM Lab' })).toHaveAttribute(
      'href',
      '/merchants/5',
    );
  });

  it('links "Ready to approve" to the agent’s ready accruals', async () => {
    const user = userEvent.setup();
    const app = await openCommissions(AGENTS);
    const zain = await agentRow('Zain Mobile Hub');
    await user.click(zain.getByRole('link', { name: 'Ready to approve for Zain Mobile Hub' }));
    await waitFor(() => expect(app.location()).toBe('/commissions?agent=1'));
    expect(await screen.findByText('1–25 of 30')).toBeInTheDocument();
  });

  it('shows the server’s error with Retry when the agents cannot be loaded', async () => {
    mockServer.use(
      http.get('*/admin/commission-assignments', () => problem(500, 'INTERNAL', 'Server error', 'Down.')),
    );
    await openCommissions(AGENTS);
    expect(await screen.findByText('Could not load the agents')).toBeInTheDocument();
  });

  it('says there are no agents yet, with the Assign plan button, once every assignment has ended', async () => {
    const user = userEvent.setup();
    await openCommissions(AGENTS);
    for (const name of ['Zain Mobile Hub', 'Cairo GSM Lab']) {
      await user.click((await agentRow(name)).getByRole('button', { name: `End plan of ${name}` }));
      await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'End plan' }));
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    }
    expect(await screen.findByText('No agents yet')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Assign plan' })).toHaveLength(2);
  });
});

describe('Assign plan', () => {
  it('puts a merchant on a plan and shows it as an agent', async () => {
    const user = userEvent.setup();
    const requests = recordRequests();
    await openCommissions(AGENTS);
    await user.click(await screen.findByRole('button', { name: 'Assign plan' }));
    const dialog = dialogOf('Assign a plan');
    const merchant = await dialog.findByRole('combobox', { name: 'Merchant' });
    await waitFor(() => expect(within(merchant).getAllByRole('option').length).toBeGreaterThan(5));
    await user.selectOptions(merchant, 'Casablanca Unlock');
    await user.selectOptions(dialog.getByRole('combobox', { name: 'Plan' }), 'Partner (5%)');
    await user.click(dialog.getByRole('button', { name: 'Assign plan' }));

    expect(await screen.findByText('Casablanca Unlock is on a plan now')).toBeInTheDocument();
    const post = requests
      .sent()
      .find((request) => request.method === 'POST' && request.url.pathname.includes('commission'));
    expect(post?.url.pathname).toBe('/admin/commission-assignments');
    expect(post?.body).toEqual({ beneficiaryId: 8, planId: 2 });
    const row = await agentRow('Casablanca Unlock');
    expect(row.getByText('Partner')).toBeInTheDocument();
    expect((await listAssignments()).total).toBe(3);
  });

  it('asks for a merchant and a plan before it sends anything', async () => {
    const user = userEvent.setup();
    const requests = recordRequests();
    await openCommissions(AGENTS);
    await user.click(await screen.findByRole('button', { name: 'Assign plan' }));
    const dialog = dialogOf('Assign a plan');
    await user.click(dialog.getByRole('button', { name: 'Assign plan' }));
    expect(await dialog.findByText('Choose a merchant.')).toBeInTheDocument();
    expect(dialog.getByText('Choose a plan.')).toBeInTheDocument();
    expect(
      requests
        .sent()
        .some((request) => request.url.pathname.includes('commission') && request.method === 'POST'),
    ).toBe(false);
  });

  it('shows the server’s refusal of a merchant that already has a plan in the dialog', async () => {
    const user = userEvent.setup();
    await openCommissions(AGENTS);
    await user.click(await screen.findByRole('button', { name: 'Assign plan' }));
    const dialog = dialogOf('Assign a plan');
    const merchant = await dialog.findByRole('combobox', { name: 'Merchant' });
    await waitFor(() => expect(within(merchant).getAllByRole('option').length).toBeGreaterThan(5));
    await user.selectOptions(merchant, 'Zain Mobile Hub');
    await user.selectOptions(dialog.getByRole('combobox', { name: 'Plan' }), 'Partner (5%)');
    await user.click(dialog.getByRole('button', { name: 'Assign plan' }));
    expect(
      await dialog.findByText('Zain Mobile Hub is already on the Referral plan. Change its plan instead.'),
    ).toBeInTheDocument();
    expect((await listAssignments()).total).toBe(2);
  });

  it('puts the server’s field messages under the fields', async () => {
    const user = userEvent.setup();
    mockServer.use(
      http.post('*/admin/commission-assignments', () =>
        problem(422, 'VALIDATION_FAILED', 'Check the form', 'Some fields need attention.', [
          { field: 'planId', message: 'This plan is closed to new agents.' },
        ]),
      ),
    );
    await openCommissions(AGENTS);
    await user.click(await screen.findByRole('button', { name: 'Assign plan' }));
    const dialog = dialogOf('Assign a plan');
    const merchant = await dialog.findByRole('combobox', { name: 'Merchant' });
    await waitFor(() => expect(within(merchant).getAllByRole('option').length).toBeGreaterThan(5));
    await user.selectOptions(merchant, 'Casablanca Unlock');
    await user.selectOptions(dialog.getByRole('combobox', { name: 'Plan' }), 'Referral (3%)');
    await user.click(dialog.getByRole('button', { name: 'Assign plan' }));
    expect(await dialog.findByText('This plan is closed to new agents.')).toBeInTheDocument();
    expect(dialog.getByRole('combobox', { name: 'Plan' })).toHaveAttribute('aria-invalid', 'true');
  });

  it('says so, with Retry, when the merchants cannot be loaded', async () => {
    const user = userEvent.setup();
    mockServer.use(http.get('*/admin/clients', () => problem(500, 'INTERNAL', 'Server error', 'Down.')));
    await openCommissions(AGENTS);
    await user.click(await screen.findByRole('button', { name: 'Assign plan' }));
    const dialog = dialogOf('Assign a plan');
    expect(
      await dialog.findByText(/Could not load the merchants\./, {}, { timeout: 5000 }),
    ).toBeInTheDocument();
    expect(dialog.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
  });
});

describe('Change plan', () => {
  it('moves the agent to another plan and sends only the plan', async () => {
    const user = userEvent.setup();
    const requests = recordRequests();
    await openCommissions(AGENTS);
    await user.click(
      (await agentRow('Zain Mobile Hub')).getByRole('button', { name: 'Change plan of Zain Mobile Hub' }),
    );
    const dialog = dialogOf('Change plan of Zain Mobile Hub');
    expect(dialog.getByText('Now on the Referral plan')).toBeInTheDocument();
    const plan = dialog.getByRole('combobox', { name: 'Plan' });
    expect(plan).toHaveValue('1');
    await user.selectOptions(plan, 'Partner (5%)');
    await user.click(dialog.getByRole('button', { name: 'Save plan' }));

    expect(await screen.findByText('Zain Mobile Hub moved to Partner')).toBeInTheDocument();
    const patch = requests.sent().find((request) => request.method === 'PATCH');
    expect(patch?.url.pathname).toBe('/admin/commission-assignments/1');
    expect(patch?.body).toEqual({ planId: 2 });
    await waitFor(async () =>
      expect((await agentRow('Zain Mobile Hub')).getByText('5%')).toBeInTheDocument(),
    );
  });

  it('sends nothing when the plan is the same', async () => {
    const user = userEvent.setup();
    const requests = recordRequests();
    await openCommissions(AGENTS);
    await user.click(
      (await agentRow('Cairo GSM Lab')).getByRole('button', { name: 'Change plan of Cairo GSM Lab' }),
    );
    await user.click(dialogOf('Change plan of Cairo GSM Lab').getByRole('button', { name: 'Save plan' }));
    expect(await screen.findByText('Nothing changed')).toBeInTheDocument();
    expect(requests.sent().some((request) => request.method === 'PATCH')).toBe(false);
  });

  it('shows the server’s message when the change is refused', async () => {
    const user = userEvent.setup();
    mockServer.use(
      http.patch('*/admin/commission-assignments/:id', () =>
        problem(409, 'PLAN_LOCKED', 'Plan locked', 'Plans cannot change during the settlement run.'),
      ),
    );
    await openCommissions(AGENTS);
    await user.click(
      (await agentRow('Zain Mobile Hub')).getByRole('button', { name: 'Change plan of Zain Mobile Hub' }),
    );
    const dialog = dialogOf('Change plan of Zain Mobile Hub');
    await user.selectOptions(dialog.getByRole('combobox', { name: 'Plan' }), 'Partner (5%)');
    await user.click(dialog.getByRole('button', { name: 'Save plan' }));
    expect(await dialog.findByText('Plans cannot change during the settlement run.')).toBeInTheDocument();
  });
});

describe('End', () => {
  it('ends the assignment after a review step, and the agent leaves the list', async () => {
    const user = userEvent.setup();
    const requests = recordRequests();
    await openCommissions(AGENTS);
    await user.click(
      (await agentRow('Cairo GSM Lab')).getByRole('button', { name: 'End plan of Cairo GSM Lab' }),
    );
    const dialog = dialogOf('End Cairo GSM Lab’s plan?');
    expect(dialog.getByText(/stops earning on the Partner plan for new orders/)).toBeInTheDocument();
    await user.click(dialog.getByRole('button', { name: 'End plan' }));
    expect(await screen.findByText('Cairo GSM Lab’s plan ended')).toBeInTheDocument();
    const del = requests.sent().find((request) => request.method === 'DELETE');
    expect(del?.url.pathname).toBe('/admin/commission-assignments/2');
    await waitFor(() =>
      expect(screen.queryByRole('link', { name: 'Cairo GSM Lab' })).not.toBeInTheDocument(),
    );
    expect((await listAssignments()).total).toBe(1);
  });

  it('keeps the dialog open with the server’s message when the end is refused', async () => {
    const user = userEvent.setup();
    mockServer.use(
      http.delete('*/admin/commission-assignments/:id', () =>
        problem(409, 'HAS_PENDING', 'Cannot end', 'Approve the ready accruals before ending this plan.'),
      ),
    );
    await openCommissions(AGENTS);
    await user.click(
      (await agentRow('Zain Mobile Hub')).getByRole('button', { name: 'End plan of Zain Mobile Hub' }),
    );
    const dialog = dialogOf('End Zain Mobile Hub’s plan?');
    await user.click(dialog.getByRole('button', { name: 'End plan' }));
    expect(
      await dialog.findByText('Approve the ready accruals before ending this plan.'),
    ).toBeInTheDocument();
    expect(await agentRow('Zain Mobile Hub')).toBeTruthy();
  });
});
