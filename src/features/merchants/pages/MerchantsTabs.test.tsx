// Tests for the tab the map adds to the merchants list, run through the whole app against the dev mock API: Groups (the table,
// New group, Edit, Delete and the server's refusal), and for old addresses of the retired Verification and Pending approval tabs.
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import { mockServer } from '@/mocks/node';
import { problem } from '@/mocks/problem';
import { setupMockApi } from '@/test/renderApp';
import { installMerchantMocks } from '../test/installMerchantMocks';
import { openMerchants, rowOf, statusTabs, tableNamed, tabTexts } from '../test/openMerchants';

setupMockApi();
installMerchantMocks();
// The page is a lazy chunk: the first test of a run waits for its modules to load, which is slow while the whole suite
// runs in parallel. Every flow here also goes through the mock API with real dialogs, so give them room.
vi.setConfig({ testTimeout: 30_000 });

describe('Groups tab', () => {
  it('lists the groups with discount, deposit limit, credit and merchants', async () => {
    const app = await openMerchants('/merchants?tab=groups');
    expect(await screen.findByRole('heading', { name: 'Merchant groups' })).toBeInTheDocument();
    const standard = await rowOf('Merchant groups', 'Standard');
    expect(standard.getByText('Default')).toBeInTheDocument();
    expect(standard.getByText('0%')).toBeInTheDocument();
    expect(standard.getByText('$5,000')).toBeInTheDocument();
    expect(standard.getByText('Not allowed')).toBeInTheDocument();
    expect(standard.getByRole('link', { name: '11' })).toHaveAttribute('href', '/merchants?group=1');
    const wholesale = await rowOf('Merchant groups', 'Wholesale');
    expect(wholesale.getByText('4%')).toBeInTheDocument();
    expect(wholesale.getByText('$20,000')).toBeInTheDocument();
    expect(wholesale.getByText('Allowed')).toBeInTheDocument();
    const retail = await rowOf('Merchant groups', 'Storefront retail');
    expect(retail.getAllByText('Storefront retail')).toHaveLength(2);
    expect(app.location()).toBe('/merchants?tab=groups');
  });

  it('creates a group, checks the form first, and the new group shows with the tab count', async () => {
    const user = userEvent.setup();
    await openMerchants('/merchants?tab=groups');
    await user.click(await screen.findByRole('button', { name: 'New group' }));
    const dialog = await screen.findByRole('dialog', { name: 'New group' });
    await user.clear(within(dialog).getByLabelText('Discount (%)'));
    await user.type(within(dialog).getByLabelText('Discount (%)'), '150');
    await user.click(within(dialog).getByRole('button', { name: 'Create group' }));
    expect(await within(dialog).findByText('Enter a group name.')).toBeInTheDocument();
    expect(within(dialog).getByText('Enter a percent from 0 to 100.')).toBeInTheDocument();

    await user.type(within(dialog).getByLabelText('Group name'), 'Reseller');
    await user.clear(within(dialog).getByLabelText('Discount (%)'));
    await user.type(within(dialog).getByLabelText('Discount (%)'), '6');
    await user.clear(within(dialog).getByLabelText('Deposit limit (USD)'));
    await user.type(within(dialog).getByLabelText('Deposit limit (USD)'), '50,000');
    await user.click(within(dialog).getByLabelText('Merchants in this group can use a credit limit'));
    await user.click(within(dialog).getByRole('button', { name: 'Create group' }));

    expect(await screen.findByText('Reseller group created')).toBeInTheDocument();
    const row = await rowOf('Merchant groups', 'Reseller');
    expect(row.getByText('6%')).toBeInTheDocument();
    expect(row.getByText('$50,000')).toBeInTheDocument();
    expect(row.getByText('Allowed')).toBeInTheDocument();
    await waitFor(() =>
      expect(statusTabs().getByRole('tab', { name: /Groups/ })).toHaveTextContent('Groups5'),
    );
  });

  it('shows the server’s message under the name when it is taken', async () => {
    const user = userEvent.setup();
    await openMerchants('/merchants?tab=groups');
    await user.click(await screen.findByRole('button', { name: 'New group' }));
    const dialog = await screen.findByRole('dialog', { name: 'New group' });
    await user.type(within(dialog).getByLabelText('Group name'), 'vip');
    await user.click(within(dialog).getByRole('button', { name: 'Create group' }));
    expect(await within(dialog).findByText('A group with this name already exists.')).toBeInTheDocument();
    expect(within(dialog).getByLabelText('Group name')).toHaveAttribute('aria-invalid', 'true');
  });

  it('edits a group and sends only what changed; says nothing changed when it did not', async () => {
    const user = userEvent.setup();
    await openMerchants('/merchants?tab=groups');
    await user.click(await screen.findByRole('button', { name: 'Edit Wholesale' }));
    const dialog = await screen.findByRole('dialog', { name: 'Edit Wholesale' });
    expect(within(dialog).getByLabelText('Discount (%)')).toHaveValue('4');
    expect(within(dialog).getByLabelText('Deposit limit (USD)')).toHaveValue('20000.00');
    expect(within(dialog).getByText(/6 merchants are in this group/)).toBeInTheDocument();

    await user.click(within(dialog).getByRole('button', { name: 'Save changes' }));
    expect(await screen.findByText('Nothing changed')).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: 'Edit Wholesale' })).not.toBeInTheDocument(),
    );

    let body: unknown;
    mockServer.use(
      http.patch('*/admin/client-groups/:id', async ({ request, params }) => {
        body = await request.json();
        return problem(409, 'X', 'Stop', `seen ${String(params.id)}`);
      }),
    );
    await user.click(screen.getByRole('button', { name: 'Edit Wholesale' }));
    const again = await screen.findByRole('dialog', { name: 'Edit Wholesale' });
    await user.clear(within(again).getByLabelText('Discount (%)'));
    await user.type(within(again).getByLabelText('Discount (%)'), '5');
    await user.click(within(again).getByRole('button', { name: 'Save changes' }));
    expect(await within(again).findByText('seen 2')).toBeInTheDocument();
    expect(body).toEqual({ discountPercent: '5' });
  });

  it('applies a change and shows it in the table', async () => {
    const user = userEvent.setup();
    await openMerchants('/merchants?tab=groups');
    await user.click(await screen.findByRole('button', { name: 'Edit VIP' }));
    const dialog = await screen.findByRole('dialog', { name: 'Edit VIP' });
    await user.clear(within(dialog).getByLabelText('Discount (%)'));
    await user.type(within(dialog).getByLabelText('Discount (%)'), '9.5');
    await user.click(within(dialog).getByRole('button', { name: 'Save changes' }));
    expect(await screen.findByText('VIP group updated')).toBeInTheDocument();
    expect(screen.getByText('The change applies to the next order of its merchants.')).toBeInTheDocument();
    expect((await rowOf('Merchant groups', 'VIP')).getByText('9.5%')).toBeInTheDocument();
  });

  it('deletes a group after a review step; a group with merchants cannot be deleted', async () => {
    const user = userEvent.setup();
    await openMerchants('/merchants?tab=groups');
    const inUse = await screen.findByRole('button', { name: 'Delete VIP' });
    expect(inUse).toBeDisabled();
    expect(inUse).toHaveAttribute('title', 'Move its merchants to another group first.');

    await user.click(screen.getByRole('button', { name: 'Delete Storefront retail' }));
    const dialog = await screen.findByRole('dialog', { name: 'Delete Storefront retail?' });
    await user.click(within(dialog).getByRole('button', { name: 'Delete group' }));
    expect(await screen.findByText('Storefront retail group deleted')).toBeInTheDocument();
    await waitFor(async () =>
      expect((await tableNamed('Merchant groups')).queryByText('Storefront retail')).not.toBeInTheDocument(),
    );
  });

  it('shows the server’s refusal in the dialog and keeps the group', async () => {
    const user = userEvent.setup();
    await openMerchants('/merchants?tab=groups');
    mockServer.use(
      http.delete('*/admin/client-groups/:id', () =>
        problem(
          409,
          'GROUP_IN_USE',
          'The group still has merchants',
          'Move the 2 merchants in it to another group first.',
        ),
      ),
    );
    await user.click(await screen.findByRole('button', { name: 'Delete Storefront retail' }));
    const dialog = await screen.findByRole('dialog', { name: 'Delete Storefront retail?' });
    await user.click(within(dialog).getByRole('button', { name: 'Delete group' }));
    expect(
      await within(dialog).findByText('Move the 2 merchants in it to another group first.'),
    ).toBeInTheDocument();
    expect(await rowOf('Merchant groups', 'Storefront retail')).toBeTruthy();
  });

  it('disables the actions a role without the permission cannot take', async () => {
    await openMerchants('/merchants?tab=groups', { permissions: ['groups:read'] });
    const create = await screen.findByRole('button', { name: 'New group' });
    expect(create).toBeDisabled();
    expect(create).toHaveAttribute('title', 'You need the groups:create permission');
    expect(await screen.findByRole('button', { name: 'Edit VIP' })).toHaveAttribute(
      'title',
      'You need the groups:update permission',
    );
    expect(await screen.findByRole('button', { name: 'Delete VIP' })).toHaveAttribute(
      'title',
      'You need the groups:delete permission',
    );
  });

  it('shows no upgrade threshold, even from a server that still sends one, and never sends one', async () => {
    const user = userEvent.setup();
    let created: unknown;
    mockServer.use(
      http.get('*/admin/client-groups', () =>
        HttpResponse.json(
          [
            {
              id: 1,
              name: 'Standard',
              kind: 'b2b',
              discountPercent: '0.0000',
              isDefault: true,
              earnThreshold: '7777.0000',
              depositLimit: '5000.0000',
              overdraftAllowed: false,
              sort: 1,
              createdAt: '2026-01-01T00:00:00.000Z',
              merchantCount: 2,
            },
          ],
          { headers: { 'x-total-count': '1' } },
        ),
      ),
      http.post('*/admin/client-groups', async ({ request }) => {
        created = await request.json();
        return problem(409, 'X', 'Stop', 'seen');
      }),
    );
    await openMerchants('/merchants?tab=groups');
    const table = await tableNamed('Merchant groups');
    expect(await table.findByText('Standard')).toBeInTheDocument();
    expect(table.queryByText('Upgrade threshold')).not.toBeInTheDocument();
    expect(table.queryByText('$7,777')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'New group' }));
    const dialog = await screen.findByRole('dialog', { name: 'New group' });
    expect(within(dialog).queryByLabelText(/Upgrade threshold/)).not.toBeInTheDocument();
    await user.type(within(dialog).getByLabelText('Group name'), 'Reseller');
    await user.click(within(dialog).getByRole('button', { name: 'Create group' }));
    expect(await within(dialog).findByText('seen')).toBeInTheDocument();
    expect(created).toEqual({
      name: 'Reseller',
      discountPercent: '0',
      depositLimit: '0.0000',
      overdraftAllowed: false,
      isDefault: false,
    });
  });
});

// The Verification tab was retired (MISMATCHES M278). A bookmark or a link from an older page must still open the list.
describe('an old address of the retired Verification tab', () => {
  it('opens the first tab with the merchant table, without an error', async () => {
    await openMerchants('/merchants?tab=verification&kycStatus=approved&kyc=1');
    await waitFor(() => expect(tabTexts()).toEqual(['All20', 'Active18', 'Suspended1', 'Groups4']));
    expect(screen.getByRole('tab', { name: /^All/ })).toHaveAttribute('aria-selected', 'true');
    expect(await rowOf('Merchants', 'Zain Mobile Hub')).toBeTruthy();
    expect(screen.queryByRole('tab', { name: /Verification/ })).not.toBeInTheDocument();
  });

  it('keeps the filters of the old address that are still in use', async () => {
    await openMerchants('/merchants?tab=verification&kycStatus=all&q=zain');
    expect(await screen.findByRole('searchbox', { name: 'Search name, company, email' })).toHaveValue('zain');
    expect(await rowOf('Merchants', 'Zain Mobile Hub')).toBeTruthy();
  });
});

// The Pending approval tab was retired with the approval step. A bookmark, an older dashboard link or an address copied before the
// change must still open the list.
describe('an old address of the retired Pending approval tab', () => {
  it('opens the first tab with the merchant table, without an error', async () => {
    await openMerchants('/merchants?tab=pending');
    await waitFor(() => expect(tabTexts()).toEqual(['All20', 'Active18', 'Suspended1', 'Groups4']));
    expect(screen.getByRole('tab', { name: /^All/ })).toHaveAttribute('aria-selected', 'true');
    expect(screen.queryByRole('tab', { name: /Pending/ })).not.toBeInTheDocument();
    expect(await rowOf('Merchants', 'Zain Mobile Hub')).toBeTruthy();
    // The one account that is still pending is a row of the list like any other, with its status word.
    expect((await rowOf('Merchants', 'Accra Devices')).getByText('Pending')).toBeInTheDocument();
  });

  it('keeps the filters of the old address that are still in use', async () => {
    await openMerchants('/merchants?tab=pending&q=zain&group=3');
    expect(await screen.findByRole('searchbox', { name: 'Search name, company, email' })).toHaveValue('zain');
    expect(await rowOf('Merchants', 'Zain Mobile Hub')).toBeTruthy();
  });
});
