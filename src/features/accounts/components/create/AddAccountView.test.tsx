// Tests for the +Add Account view, run through the whole app against the dev mock API: the rows in the layout's order, the Rank menu (merchant
// ranks are the Owner's, retail alone without groups:read), Company and Credit limit only for a merchant rank, a retail account and a
// merchant added by link, a temporary password shown once before the new account opens on Security, the checks before the server is
// called, the server's refusals under their fields (a taken email, a guest that bought with it), and the question asked before leaving
// typing behind. Ports the invite, add-customer and check cases of the old merchants and customers pages.
import { screen, waitFor, within } from '@testing-library/react';
import { chooseCountry, countryRowTexts } from '@/components/ui/testing/countryField';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import { mockServer } from '@/mocks/node';
import { problem } from '@/mocks/problem';
import { setupMockApi } from '@/test/renderApp';
import { renderAccounts, type RenderOptions } from '../../pages/test-utils';
import { installAccountMocks } from '../../test/installAccountMocks';

setupMockApi();
installAccountMocks();
// The page is a lazy chunk and every flow here goes through the mock API, so give them room.
vi.setConfig({ testTimeout: 30_000 });

const ADD = '/accounts?view=add';

type User = ReturnType<typeof userEvent.setup>;

const box = (name: string) => screen.getByRole('textbox', { name });
const menu = (name: string) => screen.getByRole('combobox', { name });
const toggle = (name: string) => screen.getByRole('switch', { name });
const addButton = () => screen.getByRole('button', { name: 'Add' });
const optionTexts = (name: string) =>
  within(menu(name))
    .getAllByRole('option')
    .map((option) => option.textContent);

/** Opens the view and waits until its Rank menu holds the merchant ranks (when the role may list them). */
async function openForm(options: RenderOptions = {}, ranks = true) {
  const app = await renderAccounts(ADD, options);
  await screen.findByRole('textbox', { name: 'Name' }, { timeout: 10_000 });
  if (ranks) await within(menu('Rank')).findByRole('option', { name: /VIP/ });
  return { app, user: userEvent.setup() };
}

/** Types the three things a retail account needs. */
// Fills what every account needs. No country is chosen for the person (decision 041), so the helper picks one; pass '' to leave it empty.
async function fillRetail(
  user: User,
  name = 'Pat Example',
  email = 'Pat.Example@Mail.example',
  country = 'GB',
) {
  await user.type(box('Name'), name);
  await user.type(box('Email'), email);
  if (country) await chooseCountry(user, menu('Country'), country);
}

// The JSON body of every create call; the mock then answers as usual.
function recordBodies(): unknown[] {
  const bodies: unknown[] = [];
  mockServer.use(
    http.post('*/admin/clients', async ({ request }) => {
      bodies.push(await request.clone().json());
      return undefined;
    }),
  );
  return bodies;
}

describe('the form', () => {
  it('has a heading and the rows in the order of the layout', async () => {
    await openForm();
    expect(screen.getByRole('heading', { level: 2, name: 'Add Account' })).toBeInTheDocument();
    const labels = [...document.querySelectorAll('.form-row-label')].map((label) =>
      label.textContent?.replace('*', ''),
    );
    expect(labels).toEqual(['Name', 'Email', 'Rank', 'Country', 'Phone', 'How', '']);
    expect(addButton()).toBeEnabled();
    expect(
      screen.getByText('Marketing emails stay off. Only the person can agree to them.'),
    ).toBeInTheDocument();
  });

  it('starts as a retail account that gets a link, with no country chosen', async () => {
    await openForm();
    expect(menu('Rank')).toHaveDisplayValue('Retail (shop)');
    expect(menu('Country')).toHaveAttribute('data-value', '');
    expect(menu('Country')).toHaveTextContent('Choose a country');
    expect(toggle('How')).toHaveAttribute('aria-checked', 'true');
    expect(within(toggle('How')).getByText('Send a link')).toBeInTheDocument();
    expect(within(toggle('How')).getByText('Temporary password')).toBeInTheDocument();
    expect(screen.queryByRole('textbox', { name: 'Company' })).not.toBeInTheDocument();
    expect(screen.queryByRole('textbox', { name: 'Credit limit' })).not.toBeInTheDocument();
    expect(screen.getByText('Sets the currency and VAT of their orders.')).toBeInTheDocument();
  });

  it('draws the view in the frame of the page: a form that ends with its pinned bar', async () => {
    await openForm();
    const frame = screen.getByRole('heading', { level: 2, name: 'Add Account' }).closest('form');
    if (!frame) throw new Error('The heading is not inside a form.');
    expect(frame).toHaveClass('view-frame');
    expect(within(frame).getByRole('button', { name: 'Add' })).toBeInTheDocument();
  });
});

describe('who may add', () => {
  it('opens the list instead of the form for a role that cannot create accounts', async () => {
    const app = await renderAccounts(ADD, { role: 'reader' });
    expect(await screen.findByRole('table', { name: 'Accounts' }, { timeout: 10_000 })).toBeInTheDocument();
    expect(screen.queryByRole('textbox', { name: 'Name' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Add Account' })).not.toBeInTheDocument();
    await waitFor(() => expect(app.location()).toBe('/accounts'));
  });
});

describe('the Rank menu', () => {
  it('offers the Owner retail first, then the merchant ranks with the default one marked', async () => {
    await openForm();
    expect(optionTexts('Rank')).toEqual([
      'Retail (shop)',
      'Standard · new merchants start here',
      'Wholesale (-4%)',
      'VIP (-8%)',
    ]);
    expect(screen.queryByText('Only the Owner gives a merchant rank.')).not.toBeInTheDocument();
  });

  it('shows a role that is not the Owner the merchant ranks as disabled options, and says who gives one', async () => {
    await openForm({ role: 'manager' });
    expect(optionTexts('Rank')).toEqual([
      'Retail (shop)',
      'Standard: Owner only',
      'Wholesale: Owner only',
      'VIP: Owner only',
    ]);
    for (const name of ['Standard: Owner only', 'VIP: Owner only']) {
      expect(screen.getByRole('option', { name })).toBeDisabled();
    }
    expect(screen.getByRole('option', { name: 'Retail (shop)' })).toBeEnabled();
    expect(screen.getByText('Only the Owner gives a merchant rank.')).toBeInTheDocument();
  });

  it('holds retail alone without groups:read, and says what is missing', async () => {
    await openForm({ permissions: ['clients:read', 'clients:create'] }, false);
    expect(optionTexts('Rank')).toEqual(['Retail (shop)']);
    expect(screen.getByText('You need the groups:read permission to list the ranks')).toBeInTheDocument();
  });

  it('shows Company and Credit limit only for a merchant rank, and a Country menu of every country', async () => {
    const { user } = await openForm();
    await user.selectOptions(menu('Rank'), 'VIP (-8%)');
    expect(box('Company')).toBeInTheDocument();
    expect(box('Credit limit')).toBeInTheDocument();
    // The menu holds every ISO country; nothing is typed and nothing is chosen at first.
    expect(screen.queryByRole('textbox', { name: 'Country' })).not.toBeInTheDocument();
    expect(menu('Country')).toHaveAttribute('data-value', '');
    expect(menu('Country')).toHaveTextContent('Choose a country');
    expect(screen.queryByText('Two letters, like JO or AE.')).not.toBeInTheDocument();
    const options = await countryRowTexts(user, menu('Country'));
    expect(options[0]).toBe('Choose a country');
    expect(options).toHaveLength(250);
    expect(options).toContain('Jordan (JO)');
    expect(options).toContain('Oman (OM)');
    expect(options).toContain('Poland (PL)');
    const names = options.slice(1).map((text) => text?.replace(/ \([A-Z]{2}\)$/, '') ?? '');
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b, 'en')));

    // A rank that allows no credit has no credit limit.
    await user.selectOptions(menu('Rank'), 'Standard · new merchants start here');
    expect(box('Company')).toBeInTheDocument();
    expect(screen.queryByRole('textbox', { name: 'Credit limit' })).not.toBeInTheDocument();

    // Back to retail: no company, no credit; the country menu is the same one, and a country chosen before stays chosen.
    await chooseCountry(user, menu('Country'), 'JO');
    await user.selectOptions(menu('Rank'), 'Retail (shop)');
    expect(screen.queryByRole('textbox', { name: 'Company' })).not.toBeInTheDocument();
    expect(screen.queryByRole('textbox', { name: 'Credit limit' })).not.toBeInTheDocument();
    expect(menu('Country')).toHaveTextContent('Jordan (JO)');
    expect(await countryRowTexts(user, menu('Country'))).toHaveLength(250);
  });
});

describe('adding an account', () => {
  it('adds a retail account by a link, says so, and opens its Security part', async () => {
    const { app, user } = await openForm();
    const bodies = recordBodies();
    await fillRetail(user);
    await chooseCountry(user, menu('Country'), 'DE');
    await user.type(box('Phone'), '+49 170 000');
    await user.click(addButton());

    expect(await screen.findByText('Pat Example added')).toBeInTheDocument();
    expect(
      screen.getByText('A link to set the password went to pat.example@mail.example.'),
    ).toBeInTheDocument();
    expect(bodies).toEqual([
      {
        name: 'Pat Example',
        email: 'pat.example@mail.example',
        country: 'DE',
        phone: '+49 170 000',
        password: { mode: 'reset_link' },
      },
    ]);
    await waitFor(() => expect(app.location()).toMatch(/^\/accounts\/\d+\?tab=security$/));
    expect(
      await screen.findByRole('heading', { level: 2, name: 'Pat Example' }, { timeout: 10_000 }),
    ).toBeInTheDocument();
    const password = await screen.findByRole('group', { name: 'Password' });
    expect(password).toHaveTextContent('Not set yet (invitation)');
    expect(password).toHaveTextContent('An invitation link is open.');
  });

  it('adds a merchant with a rank, a company and a credit limit, and opens its Security part', async () => {
    const { app, user } = await openForm();
    const bodies = recordBodies();
    await user.selectOptions(menu('Rank'), 'VIP (-8%)');
    await user.type(box('Name'), 'Muscat Gadgets');
    await user.type(box('Email'), 'Hello@Muscat.example');
    await chooseCountry(user, menu('Country'), 'OM');
    await user.type(box('Company'), 'Muscat Gadgets LLC');
    await user.type(box('Credit limit'), '500');
    await user.click(addButton());

    expect(await screen.findByText('Muscat Gadgets added')).toBeInTheDocument();
    expect(bodies).toEqual([
      {
        name: 'Muscat Gadgets',
        email: 'hello@muscat.example',
        country: 'OM',
        groupId: 3,
        company: 'Muscat Gadgets LLC',
        creditLimit: '500.0000',
        password: { mode: 'reset_link' },
      },
    ]);
    await waitFor(() => expect(app.location()).toMatch(/^\/accounts\/\d+\?tab=security$/));
    expect(await screen.findByRole('group', { name: 'Password' }, { timeout: 10_000 })).toBeInTheDocument();
  });

  it('leaves the company and the credit limit out of a retail account, whatever was typed before', async () => {
    const { user } = await openForm();
    const bodies = recordBodies();
    await user.selectOptions(menu('Rank'), 'VIP (-8%)');
    await user.type(box('Company'), 'Ghost Ltd');
    await user.type(box('Credit limit'), '500');
    await user.selectOptions(menu('Rank'), 'Retail (shop)');
    await fillRetail(user, 'Una Retail', 'una@mail.example');
    await user.click(addButton());
    await screen.findByText('Una Retail added');
    expect(bodies).toEqual([
      {
        name: 'Una Retail',
        email: 'una@mail.example',
        country: 'GB',
        password: { mode: 'reset_link' },
      },
    ]);
  });

  it('shows a temporary password once, then opens the Security part', async () => {
    const { app, user } = await openForm();
    const bodies = recordBodies();
    await fillRetail(user, 'Tara Temp', 'tara@mail.example');
    await user.click(toggle('How'));
    await user.click(addButton());

    const reveal = await screen.findByRole('dialog', { name: 'Temporary password for Tara Temp' });
    const password = within(reveal).getByText(/^[A-Za-z0-9]{14}$/).textContent ?? '';
    expect(password).toHaveLength(14);
    expect(within(reveal).getByRole('button', { name: 'Copy temporary password' })).toBeInTheDocument();
    expect(bodies).toEqual([
      {
        name: 'Tara Temp',
        email: 'tara@mail.example',
        country: 'GB',
        password: { mode: 'temporary_password' },
      },
    ]);
    // Nothing moves until the person has seen it.
    expect(app.location()).toBe(ADD);
    await user.click(within(reveal).getByRole('button', { name: 'Done' }));
    await waitFor(() => expect(app.location()).toMatch(/^\/accounts\/\d+\?tab=security$/));
    expect(
      await screen.findByRole('heading', { level: 2, name: 'Tara Temp' }, { timeout: 10_000 }),
    ).toBeInTheDocument();
    expect(await screen.findByRole('group', { name: 'Password' })).toHaveTextContent(
      'Temporary (must change at next sign-in)',
    );
    expect(screen.queryByText(password)).not.toBeInTheDocument();
  });

  it('opens the new account even when an older server answers with a status the console does not know', async () => {
    mockServer.use(
      http.post('*/admin/clients', () =>
        HttpResponse.json(
          { id: 901, name: 'Muscat Gadgets', email: 'hello@muscat.example', status: 'pending' },
          { status: 201 },
        ),
      ),
    );
    const { app, user } = await openForm();
    await fillRetail(user, 'Muscat Gadgets', 'hello@muscat.example');
    await user.click(addButton());
    expect(await screen.findByText('Muscat Gadgets added')).toBeInTheDocument();
    await waitFor(() => expect(app.location()).toBe('/accounts/901?tab=security'));
  });

  it('turns the temporary password off without clients:security, and says which permission is missing', async () => {
    await openForm({ permissions: ['clients:read', 'clients:create'] }, false);
    expect(toggle('How')).toBeDisabled();
    expect(toggle('How')).toHaveAttribute('title', 'You need the clients:security permission');
    expect(
      screen.getByText(/You need the clients:security permission for a temporary password/),
    ).toBeInTheDocument();
  });
});

describe("the checks and the server's refusals", () => {
  it('asks for what is missing before it calls the server', async () => {
    const { user } = await openForm();
    const bodies = recordBodies();
    await user.click(addButton());
    expect(await screen.findByText('Enter a name.')).toBeInTheDocument();
    expect(screen.getByText('Enter a valid email address.')).toBeInTheDocument();
    expect(box('Name')).toHaveAttribute('aria-invalid', 'true');
    expect(box('Email')).toHaveAttribute('aria-invalid', 'true');
    expect(bodies).toEqual([]);
  });

  it('asks a retail account for a country too, offers every country, and shows the refusal of one the shop does not sell to', async () => {
    const { user } = await openForm();
    const bodies = recordBodies();
    await fillRetail(user, 'Layla Retail', 'layla@mail.example', '');
    await user.click(addButton());
    expect(await screen.findByText('Choose a country.')).toBeInTheDocument();
    expect(menu('Country')).toHaveAttribute('aria-invalid', 'true');
    expect(bodies).toEqual([]);

    // Jordan was not one of the twelve countries the menu used to hold: it is offered and sent. The mock shop has tax rates, and the
    // server takes only their countries for a retail account then (a shop with none takes any): its refusal shows under the menu.
    await chooseCountry(user, menu('Country'), 'JO');
    await user.click(addButton());
    await waitFor(() => expect(bodies).toHaveLength(1));
    expect(bodies[0]).toMatchObject({ email: 'layla@mail.example', country: 'JO' });
    expect(await screen.findByText('Choose a country.')).toBeInTheDocument();
    expect(menu('Country')).toHaveAttribute('aria-invalid', 'true');

    await chooseCountry(user, menu('Country'), 'DE');
    await user.click(addButton());
    await screen.findByText('Layla Retail added');
    expect(bodies[1]).toMatchObject({ country: 'DE' });
  });

  it('asks for a country and an amount for a merchant rank', async () => {
    const { user } = await openForm();
    const bodies = recordBodies();
    await user.selectOptions(menu('Rank'), 'VIP (-8%)');
    await fillRetail(user, 'Copy Cat', 'copy@cat.example', '');
    await user.type(box('Credit limit'), 'lots');
    await user.click(addButton());
    expect(await screen.findByText('Choose a country.')).toBeInTheDocument();
    expect(menu('Country')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByText('Enter an amount like 500.00, or leave it empty.')).toBeInTheDocument();
    expect(bodies).toEqual([]);
  });

  it('puts the server\'s "email taken" under the email and stays on the form', async () => {
    const { app, user } = await openForm();
    await fillRetail(user, 'Copy Cat', 'daniel.whitmore@mail.example');
    await user.click(addButton());
    expect(
      await screen.findByText('daniel.whitmore@mail.example already belongs to Daniel Whitmore.'),
    ).toBeInTheDocument();
    expect(box('Email')).toHaveAttribute('aria-invalid', 'true');
    expect(app.location()).toBe(ADD);
    expect(addButton()).toBeEnabled();
  });

  it('says a guest bought with the email, with a link to that guest', async () => {
    const { app, user } = await openForm();
    await fillRetail(user, 'Copy Cat', 'Sofia.Alvarez@Inbox.example');
    await user.click(addButton());
    expect(
      await screen.findByText(/A guest bought with this email\. Make that guest an account instead\./),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open the guest' })).toHaveAttribute(
      'href',
      '/accounts?chip=guests&q=sofia.alvarez%40inbox.example',
    );
    expect(box('Email')).toHaveAttribute('aria-invalid', 'true');
    expect(app.location()).toBe(ADD);
  });

  it('places a refusal of a field under it and shows the rest beside the button', async () => {
    mockServer.use(
      http.post('*/admin/clients', () =>
        problem(422, 'VALIDATION_FAILED', 'Check the form', 'Some fields need attention.', [
          { field: 'country', message: 'Choose a country the shop sells to.' },
        ]),
      ),
    );
    const { user } = await openForm();
    await fillRetail(user);
    await user.click(addButton());
    expect(await screen.findByText('Choose a country the shop sells to.')).toBeInTheDocument();
    expect(menu('Country')).toHaveAttribute('aria-invalid', 'true');

    mockServer.use(
      http.post('*/admin/clients', () =>
        problem(403, 'FORBIDDEN', 'Not allowed', 'You may not add accounts.'),
      ),
    );
    await user.click(addButton());
    // Beside the button, in the pinned bar, not under a field.
    expect(await screen.findByText('You may not add accounts.')).toHaveAttribute('role', 'alert');
  });
});

describe('leaving the form', () => {
  it('leaves at once when nothing was typed, and adds nobody', async () => {
    const { app, user } = await openForm();
    const bodies = recordBodies();
    await user.click(screen.getByRole('link', { name: 'Ranks' }));
    await waitFor(() => expect(app.location()).toBe('/accounts?view=ranks'));
    expect(bodies).toEqual([]);
    expect(screen.queryByRole('dialog', { name: 'Discard your unsaved changes?' })).not.toBeInTheDocument();
  });

  it('asks before leaving typing behind, and stays when asked to keep editing', async () => {
    const { app, user } = await openForm();
    await user.type(box('Name'), 'Pat');
    await user.click(screen.getByRole('link', { name: 'Ranks' }));
    const dialog = await screen.findByRole('dialog', { name: 'Discard your unsaved changes?' });
    expect(within(dialog).getByText(/You have unsaved changes in Add Account/)).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Keep editing' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(app.location()).toBe(ADD);
    expect(box('Name')).toHaveValue('Pat');

    await user.click(screen.getByRole('link', { name: 'Ranks' }));
    await user.click(await screen.findByRole('button', { name: 'Discard changes' }));
    await waitFor(() => expect(app.location()).toBe('/accounts?view=ranks'));
  });
});
