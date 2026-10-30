// Tests for what the staff member's permissions open and disable on the Commissions page: the page gate, the approval, the assignment
// and plan actions (each disabled with the missing permission named in its title), and the order link. Every check is a hint for the
// user; the server still refuses what the role may not do.
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { mockMe, renderApp, setupMockApi, signInAs } from '@/test/renderApp';
import { openCommissions, rowOf } from '../test/commissionsPage';

setupMockApi();
vi.setConfig({ testTimeout: 20_000 });

const READER = ['commissions:read'];

describe('the page gate', () => {
  it('shows the no-access page to a role without commissions:read', async () => {
    await signInAs();
    mockMe({ id: 1, name: 'Rami K.', permissions: ['orders:read'] });
    renderApp('/commissions');
    expect(
      await screen.findByText('You do not have access to this page', {}, { timeout: 10_000 }),
    ).toBeInTheDocument();
    expect(screen.getByText('commissions:read')).toBeInTheDocument();
  });
});

describe('a reader of commissions', () => {
  it('sees the three tabs and the accruals, with the order number as plain text', async () => {
    await openCommissions('/commissions', { permissions: READER });
    expect(await screen.findByText('49 accruals are ready to approve.')).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getAllByRole('tab').map((tab) => tab.textContent)).toEqual([
        'Accruals49',
        'Agents',
        'Plans',
      ]),
    );
    const row = await rowOf('Commission accruals', 'CA-0161');
    expect(row.getByText('ORD-48835')).toBeInTheDocument();
    expect(row.queryByRole('button', { name: 'ORD-48835' })).not.toBeInTheDocument();
  });

  it('cannot approve: Select all and Approve say which permission they need', async () => {
    const user = userEvent.setup();
    await openCommissions('/commissions', { permissions: READER });
    const selectAll = await screen.findByRole('button', { name: 'Select all 49' });
    expect(selectAll).toBeDisabled();
    expect(selectAll).toHaveAttribute('title', 'You need the commissions:approve permission');
    await user.click(await screen.findByRole('checkbox', { name: 'Select row 161' }));
    const approve = within(screen.getByRole('region', { name: 'Bulk actions' })).getByRole('button', {
      name: 'Approve 1',
    });
    expect(approve).toBeDisabled();
    expect(approve).toHaveAttribute('title', 'You need the commissions:approve permission');
  });

  it('cannot assign, change or end a plan on the Agents tab', async () => {
    await openCommissions('/commissions?tab=agents', { permissions: READER });
    const assign = await screen.findByRole('button', { name: 'Assign plan' });
    expect(assign).toBeDisabled();
    expect(assign).toHaveAttribute('title', 'You need the commissions:create and clients:read permission');
    const row = await rowOf('Agents', 'Zain Mobile Hub');
    const change = row.getByRole('button', { name: 'Change plan of Zain Mobile Hub' });
    expect(change).toBeDisabled();
    expect(change).toHaveAttribute('title', 'You need the commissions:update permission');
    const end = row.getByRole('button', { name: 'End plan of Zain Mobile Hub' });
    expect(end).toBeDisabled();
    expect(end).toHaveAttribute('title', 'You need the commissions:delete permission');
  });

  it('cannot create, edit or delete a plan', async () => {
    await openCommissions('/commissions?tab=plans', { permissions: READER });
    const create = await screen.findByRole('button', { name: 'New plan' });
    expect(create).toBeDisabled();
    expect(create).toHaveAttribute('title', 'You need the commissions:create permission');
    const row = await rowOf('Commission plans', 'Volume rebate');
    expect(row.getByRole('button', { name: 'Edit Volume rebate plan' })).toHaveAttribute(
      'title',
      'You need the commissions:update permission',
    );
    expect(row.getByRole('button', { name: 'Delete Volume rebate plan' })).toHaveAttribute(
      'title',
      'You need the commissions:delete permission',
    );
    expect(row.getByRole('button', { name: 'Delete Volume rebate plan' })).toBeDisabled();
  });
});

describe('an approver', () => {
  it('can approve and open orders, but not change plans', async () => {
    const user = userEvent.setup();
    await openCommissions('/commissions', { permissions: [...READER, 'commissions:approve', 'orders:read'] });
    expect(await screen.findByRole('button', { name: 'Select all 49' })).toBeEnabled();
    await user.click(await screen.findByRole('checkbox', { name: 'Select row 161' }));
    expect(
      within(screen.getByRole('region', { name: 'Bulk actions' })).getByRole('button', { name: 'Approve 1' }),
    ).toBeEnabled();
    const row = await rowOf('Commission accruals', 'CA-0161');
    expect(row.getByRole('button', { name: 'ORD-48835' })).toBeEnabled();
  });
});

describe('an editor of commissions', () => {
  it('can use the whole Agents and Plans tabs with commissions:* and clients:read', async () => {
    await openCommissions('/commissions?tab=agents', { permissions: ['commissions:*', 'clients:read'] });
    expect(await screen.findByRole('button', { name: 'Assign plan' })).toBeEnabled();
    const row = await rowOf('Agents', 'Zain Mobile Hub');
    expect(row.getByRole('button', { name: 'Change plan of Zain Mobile Hub' })).toBeEnabled();
    expect(row.getByRole('button', { name: 'End plan of Zain Mobile Hub' })).toBeEnabled();
  });

  it('cannot assign a plan without clients:read, because the merchant menu needs it', async () => {
    await openCommissions('/commissions?tab=agents', { permissions: ['commissions:*'] });
    const assign = await screen.findByRole('button', { name: 'Assign plan' });
    expect(assign).toBeDisabled();
    expect(assign).toHaveAttribute('title', 'You need the clients:read permission');
  });
});
