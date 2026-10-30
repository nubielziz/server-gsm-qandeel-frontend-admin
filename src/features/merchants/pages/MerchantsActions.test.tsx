// Tests for the actions on the merchants list, run through the whole app against the dev mock API: approving a merchant from its row
// (and the server's refusal), inviting one (the form's checks, the server's "email taken" under the field), and what a role without
// some permissions sees disabled or hidden.
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import { mockServer } from '@/mocks/node';
import { problem } from '@/mocks/problem';
import { setupMockApi } from '@/test/renderApp';
import { installMerchantMocks } from '../test/installMerchantMocks';
import { openMerchants, rowOf, tabTexts } from '../test/openMerchants';

setupMockApi();
installMerchantMocks();
// The page is a lazy chunk: the first test of a run waits for its modules to load, which is slow while the whole suite
// runs in parallel. Every flow here also goes through the mock API with real dialogs, so give them room.
vi.setConfig({ testTimeout: 30_000 });

describe('approve', () => {
  it('approves a pending merchant from its row, with the demo’s toast, and the counts follow', async () => {
    const user = userEvent.setup();
    await openMerchants('/merchants?tab=pending');
    await user.click(await screen.findByRole('button', { name: 'Approve Algiers Service Plus' }));
    expect(await screen.findByText('Algiers Service Plus approved')).toBeInTheDocument();
    expect(screen.getByText('They can place orders once they fund their wallet.')).toBeInTheDocument();
    await waitFor(() =>
      expect(tabTexts()).toEqual([
        'All20',
        'Active18',
        'Pending approval1',
        'Suspended1',
        'Groups4',
        'Verification2',
      ]),
    );
    expect(screen.queryByRole('button', { name: 'Approve Algiers Service Plus' })).not.toBeInTheDocument();
    expect(await screen.findByText('1 merchant')).toBeInTheDocument();
  });

  it('shows the server’s refusal in a toast and leaves the merchant pending', async () => {
    const user = userEvent.setup();
    await openMerchants('/merchants?tab=pending');
    mockServer.use(
      http.patch('*/admin/clients/:id', () =>
        problem(
          409,
          'KYC_REQUIRED',
          'Verification not approved',
          'Approve the verification of this merchant first.',
        ),
      ),
    );
    await user.click(await screen.findByRole('button', { name: 'Approve Accra Devices' }));
    expect(await screen.findByText('Verification not approved')).toBeInTheDocument();
    expect(screen.getByText(/Approve the verification of this merchant first\./)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Approve Accra Devices' })).toBeInTheDocument();
  });
});

describe('invite', () => {
  async function openDialog(user: ReturnType<typeof userEvent.setup>) {
    await openMerchants();
    await user.click(await screen.findByRole('button', { name: 'Invite merchant' }));
    return screen.findByRole('dialog', { name: 'Invite merchant' });
  }

  it('invites a merchant, who joins the list as pending, and says an invitation went out', async () => {
    const user = userEvent.setup();
    const dialog = await openDialog(user);
    await user.type(within(dialog).getByLabelText('Business name'), 'Muscat Gadgets');
    await user.type(within(dialog).getByLabelText('Contact email'), 'Hello@Muscat.example');
    await user.type(within(dialog).getByLabelText('Country'), 'om');
    await user.type(within(dialog).getByLabelText('Credit limit (USD, optional)'), '500');
    await user.selectOptions(within(dialog).getByLabelText('Price group'), 'Wholesale (-4%)');
    await user.click(within(dialog).getByRole('button', { name: 'Send invitation' }));

    expect(await screen.findByText('Invitation sent')).toBeInTheDocument();
    expect(
      screen.getByText(
        'hello@muscat.example gets a sign-up link. The account stays pending until you approve it.',
      ),
    ).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: 'Invite merchant' })).not.toBeInTheDocument(),
    );
    await waitFor(() =>
      expect(tabTexts()).toEqual([
        'All21',
        'Active17',
        'Pending approval3',
        'Suspended1',
        'Groups4',
        'Verification2',
      ]),
    );
    const row = await rowOf('Merchants', 'Muscat Gadgets');
    expect(row.getByText('Pending')).toBeInTheDocument();
    expect(row.getByText('Wholesale')).toBeInTheDocument();
    expect(row.getByText('OM')).toBeInTheDocument();
  });

  it('starts in the default group and offers every merchant group but the storefront’s retail one', async () => {
    const user = userEvent.setup();
    const dialog = await openDialog(user);
    const group = within(dialog).getByLabelText('Price group');
    await waitFor(() => expect(group).toHaveValue('1'));
    expect(
      within(group)
        .getAllByRole('option')
        .map((option) => option.textContent),
    ).toEqual(['Default group', 'Standard', 'Wholesale (-4%)', 'VIP (-8%)']);
  });

  it('checks the form before sending and puts the server’s "email taken" under the email field', async () => {
    const user = userEvent.setup();
    const dialog = await openDialog(user);
    await user.click(within(dialog).getByRole('button', { name: 'Send invitation' }));
    expect(await within(dialog).findByText('Enter the business name.')).toBeInTheDocument();
    expect(
      within(dialog).getByText('Enter a valid email address, like owner@example.com.'),
    ).toBeInTheDocument();
    expect(within(dialog).getByText('Enter the two-letter country code.')).toBeInTheDocument();

    await user.type(within(dialog).getByLabelText('Business name'), 'Copy Cat');
    await user.type(within(dialog).getByLabelText('Contact email'), 'ops@zainmobilehub.example');
    await user.type(within(dialog).getByLabelText('Country'), 'JO');
    await user.type(within(dialog).getByLabelText('Credit limit (USD, optional)'), 'lots');
    await user.click(within(dialog).getByRole('button', { name: 'Send invitation' }));
    expect(
      await within(dialog).findByText('Enter an amount like 500.00, or leave it empty.'),
    ).toBeInTheDocument();
    await user.clear(within(dialog).getByLabelText('Credit limit (USD, optional)'));
    await user.click(within(dialog).getByRole('button', { name: 'Send invitation' }));
    expect(
      await within(dialog).findByText('A merchant with ops@zainmobilehub.example already exists.'),
    ).toBeInTheDocument();
    expect(within(dialog).getByLabelText('Contact email')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByRole('dialog', { name: 'Invite merchant' })).toBeInTheDocument();
  });
});

describe('permissions', () => {
  it('shows only the status tabs to a role that reads merchants, and disables what it cannot do', async () => {
    const user = userEvent.setup();
    await openMerchants('/merchants?tab=pending', { permissions: ['clients:read'] });
    await waitFor(() => expect(tabTexts()).toEqual(['All20', 'Active17', 'Pending approval2', 'Suspended1']));
    const invite = screen.getByRole('button', { name: 'Invite merchant' });
    expect(invite).toBeDisabled();
    expect(invite).toHaveAttribute('title', 'You need the clients:create permission');
    const approve = await screen.findByRole('button', { name: 'Approve Algiers Service Plus' });
    expect(approve).toBeDisabled();
    expect(approve).toHaveAttribute('title', 'You need the clients:update permission');
    // Without groups:read the group menu would be empty, so it is left out.
    expect(screen.queryByRole('combobox', { name: 'Filter by group' })).not.toBeInTheDocument();
    await user.click(invite);
    expect(screen.queryByRole('dialog', { name: 'Invite merchant' })).not.toBeInTheDocument();
  });

  it('falls back from a tab the role cannot read to the first one it can', async () => {
    const app = await openMerchants('/merchants?tab=pending', { permissions: ['kyc:read'] });
    await waitFor(() => expect(tabTexts()).toEqual(['Verification2']));
    expect(screen.getByRole('tab', { name: /Verification/ })).toHaveAttribute('aria-selected', 'true');
    expect(screen.queryByRole('searchbox')).not.toBeInTheDocument();
    expect(app.location()).toBe('/merchants?tab=pending');
  });

  it('shows only the Groups tab to a role that reads only groups', async () => {
    await openMerchants('/merchants', { permissions: ['groups:read'] });
    await waitFor(() => expect(tabTexts()).toEqual(['Groups4']));
    expect(await screen.findByRole('heading', { name: 'Merchant groups' })).toBeInTheDocument();
  });

  it('sends a role that reads none of the three lists to the no-access page', async () => {
    await openMerchants('/merchants', { permissions: ['orders:read'] });
    expect(await screen.findByText('You do not have access to this page')).toBeInTheDocument();
    expect(screen.queryByRole('tablist', { name: 'Merchant status' })).not.toBeInTheDocument();
  });
});
