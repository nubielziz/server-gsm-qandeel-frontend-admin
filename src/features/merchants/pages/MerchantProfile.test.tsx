// Tests for the Profile tab of a merchant's page and the parts of the header that feature 20 changed, run through the whole app
// against the dev mock API: the three cards, editing the details (only the changed fields are sent, the server's refusals show
// under their fields), the suspended banner with the server's reason, declining a pending application, and the "Invitation
// pending" chip in the merchants table.
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import { mockServer } from '@/mocks/node';
import { problem } from '@/mocks/problem';
import { setupMockApi } from '@/test/renderApp';
import { installMerchantMocks } from '../test/installMerchantMocks';
import { openMerchant, openMerchants, rowOf } from '../test/openMerchants';

setupMockApi();
installMerchantMocks();
// The page is a lazy chunk: the first test of a run waits for its modules to load, which is slow while the whole suite
// runs in parallel. Every flow here also goes through the mock API with real dialogs, so give them room.
vi.setConfig({ testTimeout: 30_000 });

const ZAIN = /Zain Mobile Hub/;
type User = ReturnType<typeof userEvent.setup>;

const profile = () => screen.getByRole('tabpanel', { name: 'Profile' });
const card = (name: string) => within(within(profile()).getByRole('region', { name }));

async function openProfile(permissions?: string[], id = 1, name: string | RegExp = ZAIN) {
  await openMerchant(id, name, '?tab=profile', permissions ? { permissions } : {});
}

async function openEdit(user: User) {
  await user.click(await screen.findByRole('button', { name: 'Edit details' }));
  return screen.findByRole('dialog', { name: 'Edit Zain Mobile Hub' });
}

describe('Profile tab', () => {
  it('shows the account, the business details and the settings in three cards', async () => {
    await openProfile();
    const account = card('Account');
    // The mock gives the merchant the same name and company.
    expect(account.getAllByText('Zain Mobile Hub', { selector: 'dd' })).toHaveLength(2);
    expect(account.getByText('ops@zainmobilehub.example', { exact: false })).toBeInTheDocument();
    expect(account.getByText('Verified')).toBeInTheDocument();
    expect(account.getByText('JO')).toBeInTheDocument();
    expect(account.queryByText('Language')).not.toBeInTheDocument();
    expect(account.getByText('zain-mobile-hub')).toBeInTheDocument();
    expect(account.getByText('GSM0001')).toBeInTheDocument();
    expect(account.getByText('VIP')).toBeInTheDocument();
    expect(account.getByText('Referred by').nextElementSibling).toHaveTextContent('–');
    expect(account.getByText('Joined')).toBeInTheDocument();
    expect(card('Business').getByText('Abdali Boulevard, Amman')).toBeInTheDocument();
    expect(card('Business').getByText('JO-1234567')).toBeInTheDocument();
    expect(card('Settings and notes').getByText('Linked')).toBeInTheDocument();
    expect(card('Settings and notes').getByText('Pays by bank transfer on Sundays.')).toBeInTheDocument();
  });

  it('says a merchant who has not verified their email is not verified, and shows dashes for empty details', async () => {
    await openProfile(undefined, 20, /Accra Devices/);
    expect(card('Account').getByText('Not verified')).toBeInTheDocument();
    expect(card('Business').getByText('Address').nextElementSibling).toHaveTextContent('–');
    expect(card('Settings and notes').getByText(/None\./)).toBeInTheDocument();
  });

  it('disables Edit details for a role without clients:update and names the permission', async () => {
    await openProfile(['clients:read']);
    const edit = await screen.findByRole('button', { name: 'Edit details' });
    expect(edit).toBeDisabled();
    expect(edit).toHaveAttribute('title', 'You need the clients:update permission');
  });
});

describe('Edit details', () => {
  it('starts with the merchant’s values and says nothing changed when nothing did', async () => {
    const user = userEvent.setup();
    await openProfile();
    const dialog = await openEdit(user);
    expect(within(dialog).getByLabelText('Name')).toHaveValue('Zain Mobile Hub');
    expect(within(dialog).getByLabelText('Email')).toHaveValue('ops@zainmobilehub.example');
    expect(within(dialog).getByLabelText('Country')).toHaveValue('JO');
    expect(within(dialog).queryByLabelText('Language')).not.toBeInTheDocument();
    expect(within(dialog).getByLabelText('Tax ID')).toHaveValue('JO-1234567');
    expect(
      within(dialog).getByText(
        'Changing the email sends a new verification link and cancels older links. The merchant stays signed in.',
      ),
    ).toBeInTheDocument();
    let called = false;
    mockServer.use(
      http.patch('*/admin/clients/:id', () => {
        called = true;
        return HttpResponse.json({});
      }),
    );
    await user.click(within(dialog).getByRole('button', { name: 'Save changes' }));
    expect(await screen.findByText('Nothing changed')).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: 'Edit Zain Mobile Hub' })).not.toBeInTheDocument(),
    );
    expect(called).toBe(false);
  });

  it('sends only the changed fields, and the profile shows the new values', async () => {
    const user = userEvent.setup();
    await openProfile();
    const dialog = await openEdit(user);
    await user.clear(within(dialog).getByLabelText('Tax ID'));
    await user.type(within(dialog).getByLabelText('Tax ID'), 'JO-7654321');
    await user.clear(within(dialog).getByLabelText('Address'));
    await user.type(within(dialog).getByLabelText('Address'), 'Rainbow Street, Amman');
    await user.click(within(dialog).getByRole('button', { name: 'Save changes' }));
    expect(await screen.findByText('Details updated')).toBeInTheDocument();
    expect(screen.getByText('2 fields saved.')).toBeInTheDocument();
    await waitFor(() => expect(card('Business').getByText('JO-7654321')).toBeInTheDocument());
    expect(card('Business').getByText('Rainbow Street, Amman')).toBeInTheDocument();
  });

  it('puts the request body together from the changed fields only, cleaned', async () => {
    const user = userEvent.setup();
    let body: unknown;
    mockServer.use(
      http.patch('*/admin/clients/:id', async ({ request }) => {
        body = await request.json();
        return HttpResponse.json({});
      }),
    );
    await openProfile();
    const dialog = await openEdit(user);
    await user.clear(within(dialog).getByLabelText('Name'));
    await user.type(within(dialog).getByLabelText('Name'), '  Zain   Hub ');
    await user.clear(within(dialog).getByLabelText('Email'));
    await user.type(within(dialog).getByLabelText('Email'), 'New@Zain.example');
    await user.click(within(dialog).getByRole('button', { name: 'Save changes' }));
    expect(
      await screen.findByText('2 fields saved. A new verification link went to new@zain.example.'),
    ).toBeInTheDocument();
    expect(body).toEqual({ name: 'Zain Hub', email: 'new@zain.example' });
  });

  it('shows EMAIL_TAKEN under the email field and keeps the dialog open', async () => {
    const user = userEvent.setup();
    await openProfile();
    const dialog = await openEdit(user);
    await user.clear(within(dialog).getByLabelText('Email'));
    await user.type(within(dialog).getByLabelText('Email'), 'info@alnoor.example');
    mockServer.use(
      http.patch('*/admin/clients/:id', () =>
        problem(409, 'EMAIL_TAKEN', 'Email already registered', 'info@alnoor.example is already in use.'),
      ),
    );
    await user.click(within(dialog).getByRole('button', { name: 'Save changes' }));
    expect(await within(dialog).findByText('info@alnoor.example is already in use.')).toBeInTheDocument();
    expect(within(dialog).getByLabelText('Email')).toHaveAttribute('aria-invalid', 'true');
  });

  it('checks the form before sending and shows a 422 from the server under its field', async () => {
    const user = userEvent.setup();
    await openProfile();
    const dialog = await openEdit(user);
    await user.clear(within(dialog).getByLabelText('Name'));
    await user.clear(within(dialog).getByLabelText('Email'));
    await user.type(within(dialog).getByLabelText('Email'), 'not-an-email');
    await user.click(within(dialog).getByRole('button', { name: 'Save changes' }));
    expect(await within(dialog).findByText('Enter a name.')).toBeInTheDocument();
    expect(
      within(dialog).getByText('Enter a valid email address, like owner@example.com.'),
    ).toBeInTheDocument();

    await user.type(within(dialog).getByLabelText('Name'), 'Zain Hub');
    await user.clear(within(dialog).getByLabelText('Email'));
    await user.type(within(dialog).getByLabelText('Email'), 'ops@zain.example');
    mockServer.use(
      http.patch('*/admin/clients/:id', () =>
        problem(422, 'VALIDATION_FAILED', 'Check the form', 'Some fields need attention.', [
          { field: 'name', message: 'That name is reserved.' },
        ]),
      ),
    );
    await user.click(within(dialog).getByRole('button', { name: 'Save changes' }));
    expect(await within(dialog).findByText('That name is reserved.')).toBeInTheDocument();
    expect(within(dialog).getByLabelText('Name')).toHaveAttribute('aria-invalid', 'true');
  });

  it('flags a text longer than the server allows before sending', async () => {
    const user = userEvent.setup();
    await openProfile();
    const dialog = await openEdit(user);
    await user.click(within(dialog).getByLabelText('Tax ID'));
    await user.clear(within(dialog).getByLabelText('Tax ID'));
    await user.paste('x'.repeat(41));
    await user.click(within(dialog).getByRole('button', { name: 'Save changes' }));
    expect(await within(dialog).findByText('Use at most 40 characters.')).toBeInTheDocument();
  });
});

describe('the suspended banner and Decline', () => {
  it('shows the server’s reason, who suspended the merchant and when', async () => {
    await openMerchant(19, /Tunis Fix Point/);
    const note = await screen.findByRole('note');
    expect(
      within(note).getByText(/Sign-in and API calls are refused\. Open orders continue\./),
    ).toBeInTheDocument();
    expect(within(note).getByText('Reason: Chargeback dispute · by Rami K. · 6d ago')).toBeInTheDocument();
  });

  it('shows the reason of a suspension made now', async () => {
    const user = userEvent.setup();
    await openMerchant(1, ZAIN);
    await user.click(screen.getByRole('button', { name: 'Suspend…' }));
    const dialog = await screen.findByRole('dialog', { name: 'Suspend Zain Mobile Hub' });
    await user.type(within(dialog).getByLabelText('Reason'), 'Fraud review');
    await user.click(within(dialog).getByRole('button', { name: 'Suspend merchant' }));
    const note = await screen.findByRole('note');
    expect(await within(note).findByText('Reason: Fraud review · by Rami K. · just now')).toBeInTheDocument();
  });

  it('gives a pending merchant Decline… beside Approve, and declining suspends the application', async () => {
    const user = userEvent.setup();
    let body: unknown;
    await openMerchant(18, /Algiers Service Plus/);
    expect(screen.getByRole('button', { name: 'Approve account' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Decline…' }));
    const dialog = await screen.findByRole('dialog', { name: 'Decline Algiers Service Plus’s application' });
    await user.click(within(dialog).getByRole('button', { name: 'Decline application' }));
    expect(await within(dialog).findByText('Add a short reason.')).toBeInTheDocument();
    mockServer.use(
      http.patch(
        '*/admin/clients/:id',
        async ({ request }) => {
          body = await request.json();
          return problem(409, 'INVALID_TRANSITION', 'Not allowed', 'Cannot decline right now.');
        },
        { once: true },
      ),
    );
    await user.type(within(dialog).getByLabelText('Reason'), 'Documents do not match');
    await user.click(within(dialog).getByRole('button', { name: 'Decline application' }));
    expect(await within(dialog).findByText('Cannot decline right now.')).toBeInTheDocument();
    expect(body).toEqual({ status: 'suspended', reason: 'Documents do not match' });

    await user.click(within(dialog).getByRole('button', { name: 'Decline application' }));
    expect(await screen.findByText('Algiers Service Plus’s application declined')).toBeInTheDocument();
    expect(within(await screen.findByRole('note')).getByText('Suspended')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Decline…' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reactivate' })).toBeInTheDocument();
  });

  it('disables Decline… for a role without clients:update', async () => {
    await openMerchant(18, /Algiers Service Plus/, '', { permissions: ['clients:read'] });
    const decline = screen.getByRole('button', { name: 'Decline…' });
    expect(decline).toBeDisabled();
    expect(decline).toHaveAttribute('title', 'You need the clients:update permission');
  });
});

describe('the merchants table', () => {
  it('marks a merchant invited by staff who has not chosen a password yet', async () => {
    await openMerchants('/merchants?tab=pending');
    expect(
      (await rowOf('Merchants', 'Algiers Service Plus')).getByText('Invitation pending'),
    ).toBeInTheDocument();
    expect(
      (await rowOf('Merchants', 'Accra Devices')).queryByText('Invitation pending'),
    ).not.toBeInTheDocument();
  });
});
