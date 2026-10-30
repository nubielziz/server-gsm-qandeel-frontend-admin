// Tests for the two tabs the map adds to the merchants list, run through the whole app against the dev mock API: Groups (the table,
// New group, Edit, Delete and the server's refusal) and Verification (the list by status, the drawer, Approve and Reject with a reason).
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http } from 'msw';
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

type User = ReturnType<typeof userEvent.setup>;

describe('Groups tab', () => {
  it('lists the groups with discount, upgrade threshold, deposit limit, credit and merchants', async () => {
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
    expect(wholesale.getByText('$5,000')).toBeInTheDocument();
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
    await user.clear(within(dialog).getByLabelText('Upgrade threshold (USD)'));
    await user.type(within(dialog).getByLabelText('Upgrade threshold (USD)'), '10000');
    await user.clear(within(dialog).getByLabelText('Deposit limit (USD)'));
    await user.type(within(dialog).getByLabelText('Deposit limit (USD)'), '50,000');
    await user.click(within(dialog).getByLabelText('Merchants in this group can use a credit limit'));
    await user.click(within(dialog).getByRole('button', { name: 'Create group' }));

    expect(await screen.findByText('Reseller group created')).toBeInTheDocument();
    const row = await rowOf('Merchant groups', 'Reseller');
    expect(row.getByText('6%')).toBeInTheDocument();
    expect(row.getByText('$10,000')).toBeInTheDocument();
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
    expect(within(dialog).getByLabelText('Upgrade threshold (USD)')).toHaveValue('5000.00');
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
});

describe('Verification tab', () => {
  const openRequest = async (user: User, name: string) => {
    await user.click(await screen.findByRole('button', { name }));
    return screen.findByRole('dialog', { name: `Verification of ${name}` });
  };

  it('opens on the pending requests and filters by status in the address', async () => {
    const user = userEvent.setup();
    const app = await openMerchants('/merchants?tab=verification');
    expect(await screen.findByText('2 requests')).toBeInTheDocument();
    expect(await rowOf('Verification requests', 'Algiers Service Plus')).toBeTruthy();
    expect(await rowOf('Verification requests', 'Accra Devices')).toBeTruthy();

    await user.selectOptions(screen.getByRole('combobox', { name: 'Filter by status' }), 'Approved');
    expect(app.location()).toBe('/merchants?tab=verification&kycStatus=approved');
    expect(await screen.findByText('3 requests')).toBeInTheDocument();
    const approved = await rowOf('Verification requests', 'Zain Mobile Hub');
    expect(approved.getByText('Approved')).toBeInTheDocument();
    expect(approved.getByText('Rami K.')).toBeInTheDocument();

    await user.selectOptions(screen.getByRole('combobox', { name: 'Filter by status' }), 'Rejected');
    expect(await screen.findByText('1 request')).toBeInTheDocument();
    expect(await rowOf('Verification requests', 'Tunis Fix Point')).toBeTruthy();

    await user.selectOptions(screen.getByRole('combobox', { name: 'Filter by status' }), 'All requests');
    expect(await screen.findByText('6 requests')).toBeInTheDocument();
    expect(app.location()).toBe('/merchants?tab=verification&kycStatus=all');
  });

  it('opens a request in a drawer with its fields and documents, kept in the address', async () => {
    const user = userEvent.setup();
    const app = await openMerchants('/merchants?tab=verification');
    const drawer = within(await openRequest(user, 'Algiers Service Plus'));
    expect(app.location()).toBe('/merchants?tab=verification&kyc=1');
    expect(drawer.getByText('ops@algiersservice.example')).toBeInTheDocument();
    expect(drawer.getByText('DZ')).toBeInTheDocument();
    expect(drawer.getAllByText('Pending').length).toBeGreaterThan(0);
    expect(drawer.getByRole('link', { name: 'Algiers Service Plus' })).toHaveAttribute(
      'href',
      '/merchants/18',
    );
    const passport = drawer.getByRole('link', { name: 'passport.jpg' });
    expect(passport).toHaveAttribute('href', 'http://api.test/admin/files/9002');
    expect(passport).toHaveAttribute('target', '_blank');
    expect(drawer.getByText('482 kB')).toBeInTheDocument();
    expect(drawer.getByRole('link', { name: 'trade-licence.pdf' })).toBeInTheDocument();
    await user.click(drawer.getByRole('button', { name: 'Close details' }));
    await waitFor(() => expect(app.location()).toBe('/merchants?tab=verification'));
  });

  it('approves a request: the drawer and the counts follow, and the merchant is marked verified', async () => {
    const user = userEvent.setup();
    await openMerchants('/merchants?tab=verification');
    const drawer = within(await openRequest(user, 'Algiers Service Plus'));
    await user.click(drawer.getByRole('button', { name: 'Approve' }));
    const dialog = await screen.findByRole('dialog', { name: 'Approve Algiers Service Plus?' });
    await user.click(within(dialog).getByRole('button', { name: 'Approve verification' }));
    expect(await screen.findByText('Algiers Service Plus verified')).toBeInTheDocument();
    await waitFor(() => expect(drawer.queryByRole('button', { name: 'Approve' })).not.toBeInTheDocument());
    expect(drawer.getAllByText('Approved').length).toBeGreaterThan(0);
    expect(drawer.getByText(/by Rami K\./)).toBeInTheDocument();
    await waitFor(() => expect(tabTexts()[5]).toBe('Verification1'));
    await user.click(drawer.getByRole('button', { name: 'Close details' }));
    await waitFor(async () =>
      expect(
        (await tableNamed('Verification requests')).queryByText('Algiers Service Plus'),
      ).not.toBeInTheDocument(),
    );
  });

  it('wants a reason to reject, then saves it with the decision', async () => {
    const user = userEvent.setup();
    await openMerchants('/merchants?tab=verification');
    const drawer = within(await openRequest(user, 'Accra Devices'));
    await user.click(drawer.getByRole('button', { name: 'Reject…' }));
    const dialog = await screen.findByRole('dialog', { name: 'Reject the verification of Accra Devices?' });
    await user.click(within(dialog).getByRole('button', { name: 'Reject verification' }));
    expect(await within(dialog).findByText('Add a reason for the rejection.')).toBeInTheDocument();
    await user.type(within(dialog).getByLabelText('Reason'), 'The licence has expired.');
    await user.click(within(dialog).getByRole('button', { name: 'Reject verification' }));
    expect(await screen.findByText('Verification of Accra Devices rejected')).toBeInTheDocument();
    await waitFor(() => expect(drawer.getAllByText('Rejected').length).toBeGreaterThan(0));
    expect(drawer.getByText('The licence has expired.')).toBeInTheDocument();
  });

  it('shows the server’s refusal in the dialog', async () => {
    const user = userEvent.setup();
    await openMerchants('/merchants?tab=verification');
    const drawer = within(await openRequest(user, 'Accra Devices'));
    mockServer.use(
      http.post('*/admin/kyc-submissions/:id/decide', () =>
        problem(409, 'ALREADY_DECIDED', 'Already decided', 'This request was already approved.'),
      ),
    );
    await user.click(drawer.getByRole('button', { name: 'Approve' }));
    const dialog = await screen.findByRole('dialog', { name: 'Approve Accra Devices?' });
    await user.click(within(dialog).getByRole('button', { name: 'Approve verification' }));
    expect(await within(dialog).findByText('This request was already approved.')).toBeInTheDocument();
  });

  it('says nothing is waiting once every pending request is decided, and offers to show them all', async () => {
    const user = userEvent.setup();
    await openMerchants('/merchants?tab=verification');
    for (const name of ['Algiers Service Plus', 'Accra Devices']) {
      const drawer = within(await openRequest(user, name));
      await user.click(drawer.getByRole('button', { name: 'Approve' }));
      const dialog = await screen.findByRole('dialog', { name: `Approve ${name}?` });
      await user.click(within(dialog).getByRole('button', { name: 'Approve verification' }));
      await screen.findByText(`${name} verified`);
      await user.click(drawer.getByRole('button', { name: 'Close details' }));
    }
    expect(await screen.findByText('Nothing is waiting for a decision')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Show all requests' }));
    expect(await screen.findByText('6 requests')).toBeInTheDocument();
  });

  it('disables the decision and the document links for a role without those permissions', async () => {
    const user = userEvent.setup();
    await openMerchants('/merchants?tab=verification', { permissions: ['kyc:read'] });
    const drawer = within(await openRequest(user, 'Algiers Service Plus'));
    const approve = drawer.getByRole('button', { name: 'Approve' });
    expect(approve).toBeDisabled();
    expect(approve).toHaveAttribute('title', 'You need the kyc:decide permission');
    expect(drawer.queryByRole('link', { name: 'passport.jpg' })).not.toBeInTheDocument();
    expect(drawer.getByText('passport.jpg')).toHaveAttribute('title', 'You need the files:read permission');
  });
});
