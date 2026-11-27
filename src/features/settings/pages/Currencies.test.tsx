// Tests for the Currencies panel of the Tax and currency tab, run through the whole app against the dev mock API: rates with the stale one
// highlighted, the Offered switch, edit rate and markup, add a currency, and Refresh rates with the server's result.
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mockServer } from '@/mocks/node';
import { problem } from '@/mocks/problem';
import { setupMockApi } from '@/test/renderApp';
import { listCurrencies } from '../api';
import { dialogOf, openSettings, rowOf } from '../test/settingsPage';
import { recordRequests } from '../test/requests';

setupMockApi();
vi.setConfig({ testTimeout: 20_000 });
afterEach(() => vi.restoreAllMocks());

const TAX = '/settings?tab=tax';
const codeOf = async (code: string) =>
  (await listCurrencies()).data.find((currency) => currency.code === code)!;

describe('the table', () => {
  it('lists the rates, marks the stale one and explains the base currency', async () => {
    await openSettings(TAX);
    const gbp = await rowOf('Currencies', 'GBP');
    expect(gbp.getByText('0.79')).toBeInTheDocument();
    expect(gbp.getByText('1.5%')).toBeInTheDocument();
    expect(gbp.getByText('Pound sterling · shown as £')).toBeInTheDocument();
    expect(gbp.getByRole('switch', { name: 'Offer prices in GBP' })).toHaveAttribute('aria-checked', 'true');
    const sek = await rowOf('Currencies', 'SEK');
    expect(sek.getByText(/^\d+d( \d+h)? ago$/)).toHaveClass('text-warn-fg');
    expect(gbp.getByText(/ago$/)).not.toHaveClass('text-warn-fg');
    const usd = await rowOf('Currencies', 'USD');
    expect(usd.getByText('Base currency')).toBeInTheDocument();
    expect(usd.getByText('Always')).toBeInTheDocument();
    expect(usd.queryByRole('button')).not.toBeInTheDocument();
  });

  it('warns that the SEK rate is old and offers Refresh now', async () => {
    await openSettings(TAX);
    expect(await screen.findByText(/The SEK rate is \d+d( \d+h)? old\./)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Refresh now' })).toBeInTheDocument();
  });

  it('follows the server’s own stale flag when it sends one', async () => {
    const currency = (id: number, code: string, patch: object = {}) => ({
      id,
      code,
      name: code,
      rateToBase: '0.7900',
      rateUpdatedAt: new Date().toISOString(),
      markupPercent: '1.5000',
      charmRounding: true,
      isStorefront: true,
      decimals: 2,
      isActive: true,
      createdAt: '2026-01-01T00:00:00.000Z',
      ...patch,
    });
    mockServer.use(
      http.get('*/admin/currencies', () =>
        HttpResponse.json(
          [currency(1, 'USD', { rateToBase: '1.0000' }), currency(2, 'GBP', { isStale: true })],
          {
            headers: { 'x-total-count': '2' },
          },
        ),
      ),
    );
    await openSettings(TAX);
    // GBP was updated a moment ago, but the server says its rate is stale.
    expect(await screen.findByText(/The GBP rate is .* old\./)).toBeInTheDocument();
  });
});

describe('the Offered switch', () => {
  it('hides a currency from customers', async () => {
    const user = userEvent.setup();
    await openSettings(TAX);
    await user.click((await rowOf('Currencies', 'GBP')).getByRole('switch', { name: 'Offer prices in GBP' }));
    expect(await screen.findByText('GBP is hidden')).toBeInTheDocument();
    expect((await codeOf('GBP')).isStorefront).toBe(false);
  });

  it('shows the server’s refusal and leaves the switch alone', async () => {
    const user = userEvent.setup();
    mockServer.use(
      http.patch('*/admin/currencies/:id', () =>
        problem(409, 'LAST_CURRENCY', 'Cannot hide it', 'Customers need at least one currency.'),
      ),
    );
    await openSettings(TAX);
    await user.click((await rowOf('Currencies', 'GBP')).getByRole('switch', { name: 'Offer prices in GBP' }));
    expect(await screen.findByText('Cannot hide it')).toBeInTheDocument();
    expect((await rowOf('Currencies', 'GBP')).getByRole('switch')).toHaveAttribute('aria-checked', 'true');
  });
});

describe('Edit rate', () => {
  it('changes the markup and sends only that', async () => {
    const user = userEvent.setup();
    const recorder = recordRequests();
    await openSettings(TAX);
    await user.click((await rowOf('Currencies', 'GBP')).getByRole('button', { name: 'Edit GBP' }));
    const dialog = dialogOf('GBP rate and markup');
    expect(dialog.getByRole('textbox', { name: 'Rate (per $1)' })).toHaveValue('0.79');
    await user.clear(dialog.getByRole('textbox', { name: 'Markup (%)' }));
    await user.type(dialog.getByRole('textbox', { name: 'Markup (%)' }), '2');
    await user.click(dialog.getByRole('button', { name: 'Save' }));
    expect(await screen.findByText('GBP saved')).toBeInTheDocument();
    expect(recorder.to('PATCH', '/admin/currencies/2')[0].body).toEqual({ markupPercent: '2' });
    expect((await rowOf('Currencies', 'GBP')).getByText('2%')).toBeInTheDocument();
  });

  it('keeps the demo’s 0 to 10 range as a hint before the request', async () => {
    const user = userEvent.setup();
    await openSettings(TAX);
    await user.click((await rowOf('Currencies', 'GBP')).getByRole('button', { name: 'Edit GBP' }));
    const dialog = dialogOf('GBP rate and markup');
    await user.clear(dialog.getByRole('textbox', { name: 'Markup (%)' }));
    await user.type(dialog.getByRole('textbox', { name: 'Markup (%)' }), '12');
    await user.click(dialog.getByRole('button', { name: 'Save' }));
    expect(await dialog.findByText('Enter a markup between 0 and 10.')).toBeInTheDocument();
    expect((await codeOf('GBP')).markupPercent).toBe('1.5000');
  });

  it('puts the server’s message under the rate', async () => {
    const user = userEvent.setup();
    mockServer.use(
      http.patch('*/admin/currencies/:id', () =>
        problem(422, 'VALIDATION_FAILED', 'Check the form', 'Some fields need attention.', [
          { field: 'rateToBase', message: 'This rate is 40% away from the market rate.' },
        ]),
      ),
    );
    await openSettings(TAX);
    await user.click((await rowOf('Currencies', 'GBP')).getByRole('button', { name: 'Edit GBP' }));
    const dialog = dialogOf('GBP rate and markup');
    await user.clear(dialog.getByRole('textbox', { name: 'Rate (per $1)' }));
    await user.type(dialog.getByRole('textbox', { name: 'Rate (per $1)' }), '1.2');
    await user.click(dialog.getByRole('button', { name: 'Save' }));
    expect(await dialog.findByText('This rate is 40% away from the market rate.')).toBeInTheDocument();
    expect(dialog.getByRole('textbox', { name: 'Rate (per $1)' })).toHaveAttribute('aria-invalid', 'true');
  });

  it('says so when nothing changed', async () => {
    const user = userEvent.setup();
    await openSettings(TAX);
    await user.click((await rowOf('Currencies', 'GBP')).getByRole('button', { name: 'Edit GBP' }));
    await user.click(dialogOf('GBP rate and markup').getByRole('button', { name: 'Save' }));
    expect(await screen.findByText('Nothing changed')).toBeInTheDocument();
  });
});

describe('Add currency', () => {
  it('picks the code from a menu, works out the name and the decimals, and sends them as before', async () => {
    const user = userEvent.setup();
    const recorder = recordRequests();
    await openSettings(TAX);
    await user.click(await screen.findByRole('button', { name: 'Add currency' }));
    const dialog = dialogOf('Add currency');
    // Name is not asked. Decimals sits in the More options fold, closed at first.
    expect(dialog.queryByRole('textbox', { name: 'Name' })).not.toBeInTheDocument();
    expect(dialog.queryByRole('textbox', { name: 'Decimals' })).not.toBeInTheDocument();
    expect(dialog.getByRole('button', { name: 'More options' })).toHaveAttribute('aria-expanded', 'false');
    expect(dialog.queryByRole('textbox', { name: 'Code' })).not.toBeInTheDocument();
    const menu = dialog.getByRole('combobox', { name: 'Code' });
    await user.selectOptions(menu, 'CHF - Swiss Franc');
    await user.type(dialog.getByRole('textbox', { name: 'Rate (per $1)' }), '0.88');
    await user.click(dialog.getByRole('button', { name: 'Add currency' }));
    expect(await screen.findByText('CHF added')).toBeInTheDocument();
    expect((await rowOf('Currencies', 'CHF')).getByText('0.88')).toBeInTheDocument();
    expect(recorder.to('POST', '/admin/currencies')[0].body).toEqual({
      code: 'CHF',
      name: 'Swiss Franc',
      rateToBase: '0.88',
      markupPercent: '1.5',
      charmRounding: true,
      isStorefront: false,
      decimals: 2,
    });
    expect(await codeOf('CHF')).toMatchObject({ name: 'Swiss Franc', markupPercent: '1.5000' });
  });

  it('does not offer a code that is already in the list, and asks for a choice before it sends anything', async () => {
    const user = userEvent.setup();
    const recorder = recordRequests();
    await openSettings(TAX);
    await rowOf('Currencies', 'GBP');
    await user.click(await screen.findByRole('button', { name: 'Add currency' }));
    const dialog = dialogOf('Add currency');
    const options = within(dialog.getByRole('combobox', { name: 'Code' }))
      .getAllByRole('option')
      .map((option) => option.textContent ?? '');
    expect(options[0]).toBe('Choose a currency…');
    expect(options.some((text) => text.startsWith('GBP - '))).toBe(false);
    expect(options.some((text) => text.startsWith('USD - '))).toBe(false);
    expect(options).toContain('JPY - Japanese Yen');
    await user.type(dialog.getByRole('textbox', { name: 'Rate (per $1)' }), '0.88');
    await user.click(dialog.getByRole('button', { name: 'Add currency' }));
    expect(await dialog.findByText('Choose a currency.')).toBeInTheDocument();
    expect(recorder.to('POST', '/admin/currencies')).toHaveLength(0);
  });

  it('gives a currency without decimals its own count', async () => {
    const user = userEvent.setup();
    const recorder = recordRequests();
    await openSettings(TAX);
    await rowOf('Currencies', 'GBP');
    await user.click(await screen.findByRole('button', { name: 'Add currency' }));
    const dialog = dialogOf('Add currency');
    await user.selectOptions(dialog.getByRole('combobox', { name: 'Code' }), 'JPY - Japanese Yen');
    await user.type(dialog.getByRole('textbox', { name: 'Rate (per $1)' }), '150');
    await user.click(dialog.getByRole('button', { name: 'Add currency' }));
    expect(await screen.findByText('JPY added')).toBeInTheDocument();
    expect(recorder.to('POST', '/admin/currencies')[0].body).toMatchObject({ code: 'JPY', decimals: 0 });
  });

  it('fills Decimals from the chosen code and follows the code until the person types in it', async () => {
    const user = userEvent.setup();
    await openSettings(TAX);
    await rowOf('Currencies', 'GBP');
    await user.click(await screen.findByRole('button', { name: 'Add currency' }));
    const dialog = dialogOf('Add currency');
    await user.click(dialog.getByRole('button', { name: 'More options' }));
    const decimals = dialog.getByRole('textbox', { name: 'Decimals' });
    expect(decimals).toHaveValue('2');
    const menu = dialog.getByRole('combobox', { name: 'Code' });
    await user.selectOptions(menu, 'JOD - Jordanian Dinar');
    expect(decimals).toHaveValue('3');
    await user.selectOptions(menu, 'JPY - Japanese Yen');
    expect(decimals).toHaveValue('0');
    await user.clear(decimals);
    await user.type(decimals, '1');
    await user.selectOptions(menu, 'CHF - Swiss Franc');
    // The person typed here, so the code no longer decides.
    expect(decimals).toHaveValue('1');
  });

  it('puts the server’s message about the decimals under the Decimals box, opens the fold, and sends a corrected value', async () => {
    const user = userEvent.setup();
    const recorder = recordRequests();
    mockServer.use(
      http.post(
        '*/admin/currencies',
        () =>
          problem(422, 'VALIDATION_FAILED', 'Check the form', 'Some fields need attention.', [
            { field: 'decimals', message: 'The card method cannot charge 3 decimals.' },
          ]),
        { once: true },
      ),
    );
    await openSettings(TAX);
    await rowOf('Currencies', 'GBP');
    await user.click(await screen.findByRole('button', { name: 'Add currency' }));
    const dialog = dialogOf('Add currency');
    await user.selectOptions(dialog.getByRole('combobox', { name: 'Code' }), 'JOD - Jordanian Dinar');
    await user.type(dialog.getByRole('textbox', { name: 'Rate (per $1)' }), '0.71');
    // The fold is closed: the browser's three decimals for JOD are sent as before, and the card method refuses them.
    await user.click(dialog.getByRole('button', { name: 'Add currency' }));
    expect(recorder.to('POST', '/admin/currencies')[0].body).toMatchObject({ code: 'JOD', decimals: 3 });
    expect(await dialog.findByText('The card method cannot charge 3 decimals.')).toBeVisible();
    const decimals = dialog.getByRole('textbox', { name: 'Decimals' });
    expect(decimals).toBeVisible();
    expect(decimals).toHaveAttribute('aria-invalid', 'true');
    expect(dialog.getByRole('button', { name: 'Hide more options' })).toHaveAttribute(
      'aria-disabled',
      'true',
    );
    await user.clear(decimals);
    await user.type(decimals, '2');
    await user.click(dialog.getByRole('button', { name: 'Add currency' }));
    expect(await screen.findByText('JOD added')).toBeInTheDocument();
    expect(recorder.to('POST', '/admin/currencies')[1].body).toMatchObject({ code: 'JOD', decimals: 2 });
    expect(await codeOf('JOD')).toMatchObject({ decimals: 2 });
  });
});

describe('Edit name and decimals', () => {
  it('keeps them in the More options fold, open when they differ from what the code gives', async () => {
    const user = userEvent.setup();
    const recorder = recordRequests();
    await openSettings(TAX);
    await user.click((await rowOf('Currencies', 'GBP')).getByRole('button', { name: 'Edit GBP' }));
    const dialog = dialogOf('GBP rate and markup');
    // The seed calls GBP "Pound sterling"; the code gives "British Pound", so the fold starts open.
    expect(dialog.getByRole('button', { name: 'Hide more options' })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
    await user.clear(dialog.getByRole('textbox', { name: 'Name' }));
    await user.type(dialog.getByRole('textbox', { name: 'Name' }), 'British pound');
    await user.clear(dialog.getByRole('textbox', { name: 'Decimals' }));
    await user.type(dialog.getByRole('textbox', { name: 'Decimals' }), '3');
    await user.click(dialog.getByRole('button', { name: 'Save' }));
    expect(await screen.findByText('GBP saved')).toBeInTheDocument();
    expect(recorder.to('PATCH', '/admin/currencies/2')[0].body).toEqual({
      name: 'British pound',
      decimals: 3,
    });
  });

  it('stays closed for a currency whose name and decimals are what its code gives, and opens on a bad decimals', async () => {
    const user = userEvent.setup();
    mockServer.use(
      http.get('*/admin/currencies', () =>
        HttpResponse.json(
          [
            {
              id: 9,
              code: 'CHF',
              name: 'Swiss Franc',
              rateToBase: '0.8800',
              rateUpdatedAt: new Date().toISOString(),
              markupPercent: '1.5000',
              charmRounding: true,
              isStorefront: true,
              decimals: 2,
              isActive: true,
              createdAt: '2026-01-01T00:00:00.000Z',
            },
          ],
          { headers: { 'x-total-count': '1' } },
        ),
      ),
    );
    await openSettings(TAX);
    await user.click((await rowOf('Currencies', 'CHF')).getByRole('button', { name: 'Edit CHF' }));
    const dialog = dialogOf('CHF rate and markup');
    expect(dialog.getByRole('button', { name: 'More options' })).toHaveAttribute('aria-expanded', 'false');
    await user.click(dialog.getByRole('button', { name: 'More options' }));
    await user.clear(dialog.getByRole('textbox', { name: 'Decimals' }));
    await user.type(dialog.getByRole('textbox', { name: 'Decimals' }), '9');
    await user.click(dialog.getByRole('button', { name: 'Hide more options' }));
    await user.click(dialog.getByRole('button', { name: 'Save' }));
    expect(await dialog.findByText('Enter 0 to 4.')).toBeVisible();
  });
});

describe('Refresh rates', () => {
  it('shows what the server refreshed and clears the stale warning', async () => {
    const user = userEvent.setup();
    await openSettings(TAX);
    await screen.findByText(/The SEK rate is/);
    await user.click(screen.getByRole('button', { name: 'Refresh rates' }));
    const dialog = dialogOf('Rates refreshed');
    expect(await dialog.findByText('Source: Mock reference rates')).toBeInTheDocument();
    expect(within(dialog.getByRole('list', { name: 'Updated rates' })).getAllByRole('listitem')).toHaveLength(
      6,
    );
    expect(await screen.findByText('6 rates refreshed')).toBeInTheDocument();
    // The dialog has two Close buttons: the corner one and the footer one.
    await user.click(dialog.getAllByRole('button', { name: 'Close' })[1]);
    await waitFor(() => expect(screen.queryByText(/The SEK rate is/)).not.toBeInTheDocument());
  });

  it('says which currency could not be refreshed and why', async () => {
    const user = userEvent.setup();
    mockServer.use(
      http.post('*/admin/currencies/refresh-fx', () =>
        HttpResponse.json({
          refreshed: [{ code: 'GBP', rateToBase: '0.7950', rateUpdatedAt: new Date().toISOString() }],
          failed: [{ code: 'SEK', message: 'The provider sent no quote for SEK.' }],
          source: 'ECB',
        }),
      ),
    );
    await openSettings(TAX);
    await user.click(await screen.findByRole('button', { name: 'Refresh rates' }));
    const dialog = dialogOf('Rates refreshed');
    expect(await dialog.findByText('The provider sent no quote for SEK.')).toBeInTheDocument();
    expect(dialog.getByText('Not updated')).toBeInTheDocument();
    expect(dialog.getByText('1 USD = 0.795 GBP')).toBeInTheDocument();
    expect(screen.getByText('1 rate refreshed')).toBeInTheDocument();
    expect(screen.getByText('1 could not be refreshed.')).toBeInTheDocument();
  });

  it('shows the server’s error when the refresh fails', async () => {
    const user = userEvent.setup();
    mockServer.use(
      http.post('*/admin/currencies/refresh-fx', () =>
        problem(502, 'FX_PROVIDER_DOWN', 'Rate provider is down', 'Try again in a few minutes.'),
      ),
    );
    await openSettings(TAX);
    await user.click(await screen.findByRole('button', { name: 'Refresh rates' }));
    expect(await screen.findByText('Rate provider is down')).toBeInTheDocument();
    expect(screen.queryByRole('dialog', { name: 'Rates refreshed' })).not.toBeInTheDocument();
  });
});

describe('permissions', () => {
  it('lets a role that can edit currencies but not refresh them see why Refresh is off', async () => {
    await openSettings(TAX, { permissions: ['settings:update', 'settings:read'] });
    const refresh = await screen.findByRole('button', { name: 'Refresh rates' });
    expect(refresh).toBeDisabled();
    expect(refresh).toHaveAttribute('title', 'You need the currencies:update permission');
    expect(screen.getByRole('button', { name: 'Add currency' })).toBeEnabled();
  });

  it('enables the switch and Edit for a role that may update settings', async () => {
    await openSettings(TAX, { permissions: ['tax:read', 'currencies:update', 'settings:update'] });
    const gbp = await rowOf('Currencies', 'GBP');
    expect(gbp.getByRole('switch')).toBeEnabled();
    expect(gbp.getByRole('button', { name: 'Edit GBP' })).toBeEnabled();
  });
});
