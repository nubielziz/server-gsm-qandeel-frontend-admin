// Tests for the Profile part, run through the whole app against the dev mock API: the rows of each kind of account, the save button that
// stays off until something changed, what a save sends (only the changed fields, cleaned), where the server's refusals show, what each
// missing permission locks, and the unsaved-changes question. Ports the edit-details cases of the old merchant and customer pages.
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import { mockServer } from '@/mocks/node';
import { problem } from '@/mocks/problem';
import { setupMockApi } from '@/test/renderApp';
import { SEED } from '../../test/apiSupport';
import { installAccountMocks } from '../../test/installAccountMocks';
import { accountState } from '../../mocks/store';
import { partsMenu, renderAccount } from '../../pages/test-utils';

setupMockApi();
installAccountMocks();
// The page is a lazy chunk and the first test of a run waits for its modules, which is slow while the whole suite runs in parallel.
vi.setConfig({ testTimeout: 30_000 });

const ZAIN = /Zain Mobile Hub/;
const DANIEL = /Daniel Whitmore/;
const SOFIA = /Sofia Alvarez/;
type User = ReturnType<typeof userEvent.setup>;

const box = (name: string) => screen.getByRole('textbox', { name });
const save = () => screen.getByRole('button', { name: 'Save' });
const profileOf = async (id: number, name: RegExp, options: Parameters<typeof renderAccount>[2] = {}) =>
  renderAccount(id, name, { ...options, tab: 'profile' });

// Records the body of each PATCH of one account and lets the mock store answer it as usual.
function watchPatches(id: number) {
  const bodies: unknown[] = [];
  mockServer.use(
    http.patch(`*/admin/clients/${id}`, async ({ request }) => {
      bodies.push(await request.clone().json());
      return undefined;
    }),
  );
  return bodies;
}

async function replace(user: User, name: string, text: string) {
  await user.clear(box(name));
  await user.type(box(name), text);
}

describe('the rows', () => {
  it("shows a merchant's own values, the username as text and nothing of the retired features", async () => {
    await profileOf(SEED.ZAIN, ZAIN);
    expect(box('Name')).toHaveValue('Zain Mobile Hub');
    expect(box('Email')).toHaveValue('ops@zainmobilehub.example');
    expect(box('Phone')).toHaveValue('');
    // A merchant's country is a menu of every country, with the stored code chosen.
    expect(screen.queryByRole('textbox', { name: 'Country' })).not.toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Country' })).toHaveValue('JO');
    expect(screen.getByRole('combobox', { name: 'Country' })).toHaveDisplayValue('Jordan (JO)');
    expect(box('Company')).toHaveValue('Zain Mobile Hub');
    expect(box('Address')).toHaveValue('Abdali Boulevard, Amman');
    expect(box('Tax number')).toHaveValue('JO-1234567');
    expect(box('Internal notes')).toHaveValue('Pays by bank transfer on Sundays.');
    expect(screen.getByText('zain-mobile-hub')).toHaveClass('mono');
    expect(screen.queryByRole('textbox', { name: 'Username' })).not.toBeInTheDocument();
    expect(
      screen.getByText('Changing it sends a new verification link and cancels older links.'),
    ).toBeInTheDocument();
    expect(screen.queryByText('Two letters, like JO or AE.')).not.toBeInTheDocument();
    for (const word of ['Referral code', 'Referred by', 'Language', 'Verification', 'KYC']) {
      expect(screen.queryByText(word)).not.toBeInTheDocument();
    }
  });

  it("shows a retail account with a menu of the shop's countries, and no company or username", async () => {
    await profileOf(SEED.DANIEL, DANIEL);
    expect(box('Name')).toHaveValue('Daniel Whitmore');
    expect(screen.getByRole('combobox', { name: 'Country' })).toHaveValue('GB');
    expect(
      screen.getByText('Applies to new orders. Past orders keep their price and VAT.'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('textbox', { name: 'Company' })).not.toBeInTheDocument();
    expect(screen.queryByText('Username')).not.toBeInTheDocument();
  });

  it("says where a guest's receipts go, and lets a role without clients:security edit that email", async () => {
    await profileOf(SEED.SOFIA, SOFIA, { permissions: ['clients:read', 'clients:update'] });
    expect(screen.getByText('Receipts and the order link are sent here.')).toBeInTheDocument();
    expect(box('Email')).not.toHaveAttribute('readonly');
  });
});

describe('saving', () => {
  it('keeps Save off until something changed, and off again when the change is undone', async () => {
    const user = userEvent.setup();
    await profileOf(SEED.ZAIN, ZAIN);
    expect(save()).toBeDisabled();
    await user.type(box('Phone'), '+962 6 555 0100');
    expect(save()).toBeEnabled();
    await user.clear(box('Phone'));
    expect(save()).toBeDisabled();
  });

  it('sends only the changed fields, shows them saved, and the form starts again from the answer', async () => {
    const user = userEvent.setup();
    const bodies = watchPatches(SEED.ZAIN);
    await profileOf(SEED.ZAIN, ZAIN);
    await replace(user, 'Tax number', 'JO-7654321');
    await replace(user, 'Address', 'Rainbow Street, Amman');
    await user.click(save());
    expect(await screen.findByText('Details saved')).toBeInTheDocument();
    expect(screen.getByText('2 fields saved.')).toBeInTheDocument();
    expect(await screen.findByText('Saved')).toBeInTheDocument();
    expect(bodies).toEqual([{ address: 'Rainbow Street, Amman', taxId: 'JO-7654321' }]);
    expect(box('Tax number')).toHaveValue('JO-7654321');
    expect(save()).toBeDisabled();
  });

  it('cleans what it sends: the name tidied, the email in lower case, a country in capitals, an emptied field as ""', async () => {
    const user = userEvent.setup();
    const bodies = watchPatches(SEED.ZAIN);
    await profileOf(SEED.ZAIN, ZAIN);
    await replace(user, 'Name', '  Zain   Hub ');
    await replace(user, 'Email', 'New@Zain.example');
    await user.selectOptions(screen.getByRole('combobox', { name: 'Country' }), 'SA');
    await user.clear(box('Tax number'));
    await user.click(save());
    expect(
      await screen.findByText('4 fields saved. A new verification link went to new@zain.example.'),
    ).toBeInTheDocument();
    expect(bodies).toEqual([{ name: 'Zain Hub', email: 'new@zain.example', country: 'SA', taxId: '' }]);
  });

  it('saves the country of a retail account from the menu', async () => {
    const user = userEvent.setup();
    const bodies = watchPatches(SEED.DANIEL);
    await profileOf(SEED.DANIEL, DANIEL);
    await user.selectOptions(screen.getByRole('combobox', { name: 'Country' }), 'IE');
    await user.click(save());
    expect(await screen.findByText('Details saved')).toBeInTheDocument();
    expect(bodies).toEqual([{ country: 'IE' }]);
  });

  it('says "Nothing changed" and sends nothing when what was typed cleans to the same values', async () => {
    const user = userEvent.setup();
    const bodies = watchPatches(SEED.ZAIN);
    await profileOf(SEED.ZAIN, ZAIN);
    await user.type(box('Phone'), '   ');
    await user.click(save());
    expect(await screen.findByText('Nothing changed')).toBeInTheDocument();
    expect(bodies).toEqual([]);
    expect(box('Phone')).toHaveValue('');
    expect(screen.queryByText('Saved')).not.toBeInTheDocument();
  });
});

describe('refusals and checks', () => {
  it('shows EMAIL_TAKEN under the email box and keeps what was typed', async () => {
    const user = userEvent.setup();
    await profileOf(SEED.ZAIN, ZAIN);
    await replace(user, 'Email', 'info@alnoor.example');
    mockServer.use(
      http.patch('*/admin/clients/:id', () =>
        problem(409, 'EMAIL_TAKEN', 'Email already registered', 'info@alnoor.example is already in use.'),
      ),
    );
    await user.click(save());
    expect(await screen.findByText('info@alnoor.example is already in use.')).toBeInTheDocument();
    expect(box('Email')).toHaveAttribute('aria-invalid', 'true');
    expect(box('Email')).toHaveValue('info@alnoor.example');
    expect(screen.queryByText('Saved')).not.toBeInTheDocument();
  });

  it('checks the form before sending, and shows a 422 of the server under its own box', async () => {
    const user = userEvent.setup();
    const bodies = watchPatches(SEED.ZAIN);
    await profileOf(SEED.ZAIN, ZAIN);
    await user.clear(box('Name'));
    await replace(user, 'Email', 'not-an-email');
    await user.click(save());
    expect(await screen.findByText('Enter a name.')).toBeInTheDocument();
    expect(screen.getByText('Enter a valid email address, like owner@example.com.')).toBeInTheDocument();
    expect(bodies).toEqual([]);

    await user.type(box('Name'), 'Zain Hub');
    await replace(user, 'Email', 'ops@zain.example');
    mockServer.use(
      http.patch('*/admin/clients/:id', () =>
        problem(422, 'VALIDATION_FAILED', 'Check the form', 'Some fields need attention.', [
          { field: 'name', message: 'That name is reserved.' },
        ]),
      ),
    );
    await user.click(save());
    expect(await screen.findByText('That name is reserved.')).toBeInTheDocument();
    expect(box('Name')).toHaveAttribute('aria-invalid', 'true');
  });

  it('flags a text longer than the server allows before sending', async () => {
    const user = userEvent.setup();
    const bodies = watchPatches(SEED.ZAIN);
    await profileOf(SEED.ZAIN, ZAIN);
    await user.click(box('Tax number'));
    await user.clear(box('Tax number'));
    await user.paste('x'.repeat(41));
    await user.click(save());
    expect(await screen.findByText('Use at most 40 characters.')).toBeInTheDocument();
    expect(bodies).toEqual([]);
  });

  it('wants a country chosen for a merchant, and says so under the menu', async () => {
    const user = userEvent.setup();
    await profileOf(SEED.ZAIN, ZAIN);
    await user.selectOptions(screen.getByRole('combobox', { name: 'Country' }), '');
    await user.click(save());
    expect(await screen.findByText('Choose a country.')).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Country' })).toHaveAttribute('aria-invalid', 'true');
  });

  it('keeps a stored country the list does not know chosen, shown as its code, and sends nothing for it', async () => {
    const user = userEvent.setup();
    const state = await accountState();
    const zain = state.accounts.find(String(SEED.ZAIN));
    if (!zain) throw new Error('The seed has no Zain account.');
    zain.country = 'XK';
    const bodies = watchPatches(SEED.ZAIN);
    await profileOf(SEED.ZAIN, ZAIN);
    const country = screen.getByRole('combobox', { name: 'Country' });
    expect(country).toHaveValue('XK');
    expect(country).toHaveDisplayValue('XK');
    await replace(user, 'Phone', '+962 79 000');
    await user.click(save());
    expect(await screen.findByText('Details saved')).toBeInTheDocument();
    expect(bodies).toEqual([{ phone: '+962 79 000' }]);
  });
});

describe('what a missing permission locks', () => {
  it('turns every box and the button off for a role without clients:update, and says why', async () => {
    await profileOf(SEED.ZAIN, ZAIN, { role: 'reader' });
    expect(box('Name')).toBeDisabled();
    expect(box('Internal notes')).toBeDisabled();
    expect(save()).toBeDisabled();
    expect(screen.getByText('You need the clients:update permission')).toBeInTheDocument();
  });

  it('makes the email of a login read-only without clients:security, and never sends it', async () => {
    const user = userEvent.setup();
    const bodies = watchPatches(SEED.ZAIN);
    await profileOf(SEED.ZAIN, ZAIN, { permissions: ['clients:read', 'clients:update'] });
    expect(box('Email')).toHaveAttribute('readonly');
    expect(screen.getByText('You need the clients:security permission')).toBeInTheDocument();
    await user.type(box('Phone'), '+962 6 555 0100');
    await user.click(save());
    expect(await screen.findByText('Details saved')).toBeInTheDocument();
    expect(bodies).toEqual([{ phone: '+962 6 555 0100' }]);
  });
});

describe('unsaved changes', () => {
  it('asks before another part is opened while something is unsaved, and goes on or stays as told', async () => {
    const user = userEvent.setup();
    const app = await profileOf(SEED.ZAIN, ZAIN);
    await user.type(box('Phone'), '+962');
    await user.click(partsMenu().getByRole('link', { name: 'Overview' }));
    const question = await screen.findByRole('dialog', { name: 'Discard your unsaved changes?' });
    expect(within(question).getByText(/unsaved changes in Profile/)).toBeInTheDocument();

    await user.click(within(question).getByRole('button', { name: 'Keep editing' }));
    expect(box('Phone')).toHaveValue('+962');
    expect(app.location()).toBe('/accounts/1?tab=profile');

    await user.click(partsMenu().getByRole('link', { name: 'Overview' }));
    await user.click(
      within(await screen.findByRole('dialog', { name: 'Discard your unsaved changes?' })).getByRole(
        'button',
        {
          name: 'Discard changes',
        },
      ),
    );
    await waitFor(() => expect(app.location()).toBe('/accounts/1'));
  });

  it('does not ask once the changes are saved', async () => {
    const user = userEvent.setup();
    const app = await profileOf(SEED.ZAIN, ZAIN);
    await user.type(box('Phone'), '+962');
    await user.click(save());
    await screen.findByText('Saved');
    await user.click(partsMenu().getByRole('link', { name: 'Overview' }));
    await waitFor(() => expect(app.location()).toBe('/accounts/1'));
    expect(screen.queryByRole('dialog', { name: 'Discard your unsaved changes?' })).not.toBeInTheDocument();
  });
});
