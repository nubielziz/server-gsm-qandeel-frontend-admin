// Tests for the dialogs of the Prices part, run through the whole app against the dev mock API: add a fixed price (the service menu, the
// server's floor under the price and its refusals), edit one (only what changed is sent), and remove one after a review step.
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import { mockServer } from '@/mocks/node';
import { problem } from '@/mocks/problem';
import { setupMockApi } from '@/test/renderApp';
import { installAccountMocks } from '../../test/installAccountMocks';
import { openPrices, rowOf } from './test-utils';

setupMockApi();
installAccountMocks();
// The page is a lazy chunk and the first test of a run waits for its modules, which is slow while the whole suite runs in parallel.
vi.setConfig({ testTimeout: 30_000 });

type User = ReturnType<typeof userEvent.setup>;

const ICLOUD = 'iCloud Clean / Lost Check';

async function openAdd(user: User) {
  await user.click(await screen.findByRole('button', { name: 'Add fixed price…' }));
  return screen.findByRole('dialog', { name: 'Add a fixed price' });
}

async function openEdit(user: User) {
  await user.click(await screen.findByRole('button', { name: `Edit the fixed price of ${ICLOUD}` }));
  return screen.findByRole('dialog', { name: `Fixed price for ${ICLOUD}` });
}

describe('adding a fixed price', () => {
  it('shows the floor under the price once a service is chosen, then saves a valid price', async () => {
    const user = userEvent.setup();
    await openPrices();
    const dialog = await openAdd(user);
    const service = within(dialog).getByLabelText('Service');
    await waitFor(() => expect(within(service).getAllByRole('option').length).toBeGreaterThan(5));
    const options = within(service)
      .getAllByRole('option')
      .map((option) => option.textContent);
    expect(options).toContain('AT&T USA Premier Unlock (floor $14.31)');
    // A service that already has a fixed price is not offered again.
    expect(options.some((text) => text?.startsWith(ICLOUD))).toBe(false);

    await user.click(within(dialog).getByRole('button', { name: 'Save fixed price' }));
    expect(await within(dialog).findByText('Choose a service.')).toBeInTheDocument();
    expect(within(dialog).getByText('Enter a price greater than zero.')).toBeInTheDocument();

    // By the service's id: user-event matches an option's text as HTML, where the & of AT&T is escaped.
    await user.selectOptions(service, '5');
    expect(
      within(dialog).getByText('Must be at or above $14.31, the floor (cost plus minimum profit).'),
    ).toBeInTheDocument();
    await user.type(within(dialog).getByLabelText('Price (USD)'), '10');
    await user.click(within(dialog).getByRole('button', { name: 'Save fixed price' }));
    expect(
      await within(dialog).findByText('Below the floor of $14.31 (cost $13.50 plus $0.81 minimum profit).'),
    ).toBeInTheDocument();
    expect(within(dialog).getByLabelText('Price (USD)')).toHaveAttribute('aria-invalid', 'true');

    await user.clear(within(dialog).getByLabelText('Price (USD)'));
    await user.type(within(dialog).getByLabelText('Price (USD)'), '15');
    await user.type(within(dialog).getByLabelText('Note (optional)'), 'Volume deal');
    await user.click(within(dialog).getByRole('button', { name: 'Save fixed price' }));
    expect(await screen.findByText('Fixed price saved')).toBeInTheDocument();
    expect(
      screen.getByText('AT&T USA Premier Unlock is now $15.00 for Zain Mobile Hub.'),
    ).toBeInTheDocument();
    const row = await rowOf('Fixed prices', 'AT&T USA Premier Unlock');
    expect(row.getByText('$15.00')).toBeInTheDocument();
    expect(row.getByText('$17.28')).toBeInTheDocument();
    expect(row.getByText('$15.90')).toBeInTheDocument();
    expect(row.getByText('Volume deal')).toBeInTheDocument();
  });

  it('sends the account, the service, the price as four-decimal text and the note', async () => {
    const user = userEvent.setup();
    let body: unknown;
    mockServer.use(
      http.post('*/admin/client-prices', async ({ request }) => {
        body = await request.json();
        return HttpResponse.json({}, { status: 201 });
      }),
    );
    await openPrices();
    const dialog = await openAdd(user);
    const service = within(dialog).getByLabelText('Service');
    await waitFor(() => expect(within(service).getAllByRole('option').length).toBeGreaterThan(5));
    await user.selectOptions(service, '5');
    await user.type(within(dialog).getByLabelText('Price (USD)'), '$15.5');
    await user.type(within(dialog).getByLabelText('Note (optional)'), '  Volume deal ');
    await user.click(within(dialog).getByRole('button', { name: 'Save fixed price' }));
    expect(await screen.findByText('Fixed price saved')).toBeInTheDocument();
    expect(body).toEqual({ clientId: 1, serviceId: 5, price: '15.5000', note: 'Volume deal' });
  });

  it('shows the server’s refusal of a second price for one service in the dialog', async () => {
    const user = userEvent.setup();
    mockServer.use(
      http.post('*/admin/client-prices', () =>
        problem(
          409,
          'PRICE_EXISTS',
          'Already priced',
          'This account already has a fixed price for that service.',
        ),
      ),
    );
    await openPrices();
    const dialog = await openAdd(user);
    const service = within(dialog).getByLabelText('Service');
    await waitFor(() => expect(within(service).getAllByRole('option').length).toBeGreaterThan(5));
    await user.selectOptions(service, '5');
    await user.type(within(dialog).getByLabelText('Price (USD)'), '20');
    await user.click(within(dialog).getByRole('button', { name: 'Save fixed price' }));
    expect(
      await within(dialog).findByText('This account already has a fixed price for that service.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('dialog', { name: 'Add a fixed price' })).toBeInTheDocument();
  });

  it('says why the service menu is empty for a role that cannot list the services', async () => {
    const user = userEvent.setup();
    await openPrices({ permissions: ['clients:read', 'pricing:read', 'pricing:create'] });
    const dialog = await openAdd(user);
    expect(
      within(dialog).getByText('You need the catalog:read permission to list the services'),
    ).toBeInTheDocument();
    expect(within(dialog).getByLabelText('Service')).toBeDisabled();
  });

  it('says why the menu is empty when the services cannot be read', async () => {
    const user = userEvent.setup();
    mockServer.use(
      http.get('*/admin/services', () => HttpResponse.json({ title: 'Broken' }, { status: 400 })),
    );
    await openPrices();
    const dialog = await openAdd(user);
    expect(
      await within(dialog).findByText('Could not load the services. Try again in a moment.'),
    ).toBeInTheDocument();
  });
});

describe('editing a fixed price', () => {
  it('starts from the price and says nothing changed when nothing did, without calling the server', async () => {
    const user = userEvent.setup();
    let called = false;
    mockServer.use(
      http.patch('*/admin/client-prices/:id', () => {
        called = true;
        return HttpResponse.json({});
      }),
    );
    await openPrices();
    const dialog = await openEdit(user);
    expect(within(dialog).getByLabelText('Price (USD)')).toHaveValue('0.10');
    expect(within(dialog).getByText(ICLOUD)).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Save fixed price' }));
    expect(await screen.findByText('Nothing changed')).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: `Fixed price for ${ICLOUD}` })).not.toBeInTheDocument(),
    );
    expect(called).toBe(false);
  });

  it('sends only what changed and shows the server’s refusal under the price', async () => {
    const user = userEvent.setup();
    let body: unknown;
    mockServer.use(
      http.patch('*/admin/client-prices/:id', async ({ request }) => {
        body = await request.json();
        return problem(422, 'VALIDATION_FAILED', 'Check the form', 'Some fields need attention.', [
          { field: 'price', message: 'Below the floor.' },
        ]);
      }),
    );
    await openPrices();
    const dialog = await openEdit(user);
    await user.clear(within(dialog).getByLabelText('Price (USD)'));
    await user.type(within(dialog).getByLabelText('Price (USD)'), '0.05');
    await user.click(within(dialog).getByRole('button', { name: 'Save fixed price' }));
    expect(await within(dialog).findByText('Below the floor.')).toBeInTheDocument();
    expect(body).toEqual({ price: '0.0500' });
  });

  it('sends only the note when only the note changed', async () => {
    const user = userEvent.setup();
    let body: unknown;
    mockServer.use(
      http.patch('*/admin/client-prices/:id', async ({ request }) => {
        body = await request.json();
        return HttpResponse.json({});
      }),
    );
    await openPrices();
    const dialog = await openEdit(user);
    await user.type(within(dialog).getByLabelText('Note (optional)'), 'Renewed in May');
    await user.click(within(dialog).getByRole('button', { name: 'Save fixed price' }));
    expect(await screen.findByText('Fixed price saved')).toBeInTheDocument();
    expect(body).toEqual({ note: 'Renewed in May' });
  });

  it('saves a new price and the row follows it', async () => {
    const user = userEvent.setup();
    await openPrices();
    const dialog = await openEdit(user);
    await user.clear(within(dialog).getByLabelText('Price (USD)'));
    await user.type(within(dialog).getByLabelText('Price (USD)'), '0.12');
    await user.click(within(dialog).getByRole('button', { name: 'Save fixed price' }));
    expect(await screen.findByText(`${ICLOUD} is now $0.12 for Zain Mobile Hub.`)).toBeInTheDocument();
    await waitFor(async () =>
      expect(
        (await rowOf('Fixed prices', ICLOUD)).getByText('$0.12', { selector: 'span.font-semibold' }),
      ).toBeInTheDocument(),
    );
  });
});

describe('removing a fixed price', () => {
  it('asks first, says what the account pays instead, and shows the empty list afterwards', async () => {
    const user = userEvent.setup();
    await openPrices();
    await user.click(await screen.findByRole('button', { name: `Remove the fixed price of ${ICLOUD}` }));
    const dialog = await screen.findByRole('dialog', { name: `Remove the fixed price of ${ICLOUD}?` });
    expect(
      within(dialog).getByText(
        /From the next order this account pays the VIP price on iCloud Clean \/ Lost Check again/,
      ),
    ).toBeInTheDocument();
    expect(within(dialog).getByText(/instead of \$0\.10/)).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Remove fixed price' }));
    expect(await screen.findByText('Fixed price removed')).toBeInTheDocument();
    expect(
      await screen.findByText('No fixed prices. This account pays the VIP price on every service.'),
    ).toBeInTheDocument();
  });

  it('shows the server’s refusal in the dialog and keeps the price', async () => {
    const user = userEvent.setup();
    mockServer.use(
      http.delete('*/admin/client-prices/:id', () =>
        problem(409, 'PRICE_IN_USE', 'In use', 'An open order is using this price.'),
      ),
    );
    await openPrices();
    await user.click(await screen.findByRole('button', { name: `Remove the fixed price of ${ICLOUD}` }));
    const dialog = await screen.findByRole('dialog', { name: `Remove the fixed price of ${ICLOUD}?` });
    await user.click(within(dialog).getByRole('button', { name: 'Remove fixed price' }));
    expect(await within(dialog).findByText('An open order is using this price.')).toBeInTheDocument();
    expect(
      (await rowOf('Fixed prices', ICLOUD)).getByText('$0.10', { selector: 'span.font-semibold' }),
    ).toBeInTheDocument();
  });
});
