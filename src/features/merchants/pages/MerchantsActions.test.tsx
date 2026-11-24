// Tests for the actions on the merchants list, run through the whole app against the dev mock API: inviting a merchant (the form's
// checks, the server's "email taken" under the field, the account active at once), and what a role without some permissions sees
// disabled or hidden.
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import { mockServer } from '@/mocks/node';
import { setupMockApi } from '@/test/renderApp';
import { installMerchantMocks } from '../test/installMerchantMocks';
import { openMerchants, rowOf, tabTexts } from '../test/openMerchants';

setupMockApi();
installMerchantMocks();
// The page is a lazy chunk: the first test of a run waits for its modules to load, which is slow while the whole suite
// runs in parallel. Every flow here also goes through the mock API with real dialogs, so give them room.
vi.setConfig({ testTimeout: 30_000 });

describe('invite', () => {
  async function openDialog(user: ReturnType<typeof userEvent.setup>) {
    await openMerchants();
    await user.click(await screen.findByRole('button', { name: 'Invite merchant' }));
    return screen.findByRole('dialog', { name: 'Invite merchant' });
  }

  it('invites a merchant, who joins the list active with an invitation pending, and says an invitation went out', async () => {
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
        'hello@muscat.example gets a link to choose a password. The account is active at once.',
      ),
    ).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: 'Invite merchant' })).not.toBeInTheDocument(),
    );
    await waitFor(() => expect(tabTexts()).toEqual(['All21', 'Active19', 'Suspended1', 'Groups4']));
    const row = await rowOf('Merchants', 'Muscat Gadgets');
    expect(row.getByText('Active')).toBeInTheDocument();
    expect(row.getByText('Invitation pending')).toBeInTheDocument();
    expect(row.getByText('Wholesale')).toBeInTheDocument();
    expect(row.getByText('OM')).toBeInTheDocument();
  });

  it('says the account waits for activation when a server not updated yet answers pending', async () => {
    mockServer.use(
      http.post('*/admin/clients', () =>
        HttpResponse.json(
          { id: 901, name: 'Muscat Gadgets', email: 'hello@muscat.example', status: 'pending' },
          { status: 201 },
        ),
      ),
    );
    const user = userEvent.setup();
    const dialog = await openDialog(user);
    await user.type(within(dialog).getByLabelText('Business name'), 'Muscat Gadgets');
    await user.type(within(dialog).getByLabelText('Contact email'), 'hello@muscat.example');
    await user.type(within(dialog).getByLabelText('Country'), 'om');
    await user.click(within(dialog).getByRole('button', { name: 'Send invitation' }));

    expect(await screen.findByText('Invitation sent')).toBeInTheDocument();
    expect(
      screen.getByText(
        'hello@muscat.example gets a link to choose a password. The account waits until you activate it on its page.',
      ),
    ).toBeInTheDocument();
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
    await openMerchants('/merchants', { permissions: ['clients:read'] });
    await waitFor(() => expect(tabTexts()).toEqual(['All20', 'Active18', 'Suspended1']));
    const invite = screen.getByRole('button', { name: 'Invite merchant' });
    expect(invite).toBeDisabled();
    expect(invite).toHaveAttribute('title', 'You need the clients:create permission');
    // Without groups:read the group menu would be empty, so it is left out.
    expect(screen.queryByRole('combobox', { name: 'Filter by group' })).not.toBeInTheDocument();
    await user.click(invite);
    expect(screen.queryByRole('dialog', { name: 'Invite merchant' })).not.toBeInTheDocument();
  });

  it('falls back from a tab the role cannot read to the first one it can', async () => {
    const app = await openMerchants('/merchants?tab=suspended', { permissions: ['groups:read'] });
    await waitFor(() => expect(tabTexts()).toEqual(['Groups4']));
    expect(screen.getByRole('tab', { name: /Groups/ })).toHaveAttribute('aria-selected', 'true');
    expect(screen.queryByRole('searchbox')).not.toBeInTheDocument();
    expect(app.location()).toBe('/merchants?tab=suspended');
  });

  it('shows only the Groups tab to a role that reads only groups', async () => {
    await openMerchants('/merchants', { permissions: ['groups:read'] });
    await waitFor(() => expect(tabTexts()).toEqual(['Groups4']));
    expect(await screen.findByRole('heading', { name: 'Merchant groups' })).toBeInTheDocument();
  });

  it('sends a role that reads neither list to the no-access page', async () => {
    await openMerchants('/merchants', { permissions: ['orders:read'] });
    expect(await screen.findByText('You do not have access to this page')).toBeInTheDocument();
    expect(screen.queryByRole('tablist', { name: 'Merchant status' })).not.toBeInTheDocument();
  });
});
