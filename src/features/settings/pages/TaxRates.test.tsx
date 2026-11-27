// Tests for the "Tax by country" panel of the Tax and currency tab, run through the whole app against the dev mock API: the table with its
// effective dates, add a rate (including one that starts later), edit with only the changes sent, the server's field errors, permissions.
import { fireEvent, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http } from 'msw';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mockServer } from '@/mocks/node';
import { problem } from '@/mocks/problem';
import { setupMockApi } from '@/test/renderApp';
import { getTaxRate, listTaxRates } from '../api';
import { dialogOf, openSettings, rowOf } from '../test/settingsPage';
import { recordRequests } from '../test/requests';

setupMockApi();
vi.setConfig({ testTimeout: 20_000 });
afterEach(() => vi.restoreAllMocks());

const TAX = '/settings?tab=tax';

describe('the table', () => {
  it('lists each country with its rate, scheme and start date', async () => {
    await openSettings(TAX);
    const uk = await rowOf('Tax by country', 'United Kingdom');
    expect(uk.getByText('20% VAT')).toBeInTheDocument();
    expect(uk.getByText('UK VAT')).toBeInTheDocument();
    expect(uk.getByText(/^\d{2} \w{3} \d{4}$/)).toBeInTheDocument();
    const germany = await rowOf('Tax by country', 'Germany');
    expect(germany.getByText('19% VAT')).toBeInTheDocument();
    expect(germany.getByText('EU OSS')).toBeInTheDocument();
    const us = await rowOf('Tax by country', 'United States');
    expect(us.getByText('No tax')).toBeInTheDocument();
    expect(us.getByText('Not collected')).toBeInTheDocument();
    expect(screen.getByRole('table', { name: 'Tax by country' })).toBeInTheDocument();
  });
});

describe('Add tax rate', () => {
  it('adds a rate that starts in the future and marks it Scheduled', async () => {
    const user = userEvent.setup();
    const recorder = recordRequests();
    await openSettings(TAX);
    await user.click(await screen.findByRole('button', { name: 'Add tax rate' }));
    const dialog = dialogOf('Add tax rate');
    await user.selectOptions(dialog.getByRole('combobox', { name: 'Country' }), 'United Kingdom (GB)');
    await user.type(dialog.getByRole('textbox', { name: 'Rate (%)' }), '22');
    fireEvent.change(dialog.getByLabelText('Rate applies from'), { target: { value: '2099-01-01' } });
    await user.click(dialog.getByRole('button', { name: 'More options' }));
    await user.type(dialog.getByRole('textbox', { name: 'Reported through' }), 'UK VAT');
    await user.click(dialog.getByRole('button', { name: 'Add tax rate' }));
    expect(await screen.findByText('Tax rate for United Kingdom added')).toBeInTheDocument();
    expect(recorder.to('POST', '/admin/tax-rates')[0].body).toEqual({
      country: 'GB',
      region: '',
      ratePercent: '22',
      taxType: 'vat',
      appliesTo: 'digital_services',
      label: '',
      ossScheme: 'UK VAT',
      validFrom: '2099-01-01T00:00:00.000Z',
      validTo: null,
    });
    // The old rate keeps its row; the new one starts later and says so.
    const scheduled = (await screen.findByText('Scheduled')).closest('tr') as HTMLElement;
    expect(scheduled).toHaveTextContent('22% VAT');
    expect(scheduled).toHaveTextContent('01 Jan 2099');
    expect((await listTaxRates({ filters: { country: 'GB' } })).total).toBe(2);
  });

  it('asks for the country, a rate and a start date before it calls the server', async () => {
    const user = userEvent.setup();
    await openSettings(TAX);
    await user.click(await screen.findByRole('button', { name: 'Add tax rate' }));
    await user.click(dialogOf('Add tax rate').getByRole('button', { name: 'Add tax rate' }));
    const dialog = dialogOf('Add tax rate');
    expect(await dialog.findByText('Choose a country.')).toBeInTheDocument();
    expect(dialog.getByText('Enter a rate from 0 to 100.')).toBeInTheDocument();
    // The start day begins on today, so it is never empty on a new rate.
    expect(dialog.getByLabelText('Rate applies from')).toHaveValue(new Date().toISOString().slice(0, 10));
  });

  it('shows four inputs, the country as a menu of every ISO country, and the rest in the fold', async () => {
    const user = userEvent.setup();
    await openSettings(TAX);
    await user.click(await screen.findByRole('button', { name: 'Add tax rate' }));
    const dialog = dialogOf('Add tax rate');
    expect(dialog.queryByRole('textbox', { name: 'Country code' })).not.toBeInTheDocument();
    const options = within(dialog.getByRole('combobox', { name: 'Country' }))
      .getAllByRole('option')
      .map((option) => option.textContent ?? '');
    expect(options[0]).toBe('Choose a country…');
    expect(options.length).toBeGreaterThan(240);
    expect(options).toContain('Japan (JP)');
    expect(options).toContain('United Kingdom (GB)');
    const names = options.slice(1).map((text) => text.replace(/ \([A-Z]{2}\)$/, ''));
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)));
    expect(options.some((text) => /\((EU|UN|ZZ|SU)\)$/.test(text))).toBe(false);
    for (const name of ['Rate (%)', 'Rate applies from']) {
      expect(dialog.getByLabelText(name)).toBeVisible();
    }
    expect(dialog.getByRole('combobox', { name: 'Kind of tax' })).toBeVisible();
    for (const name of ['Region', 'Until', 'Reported through', 'Applies to', 'Label']) {
      expect(dialog.queryByLabelText(name)).not.toBeVisible();
    }
    expect(dialog.getByRole('button', { name: 'More options' })).toHaveAttribute('aria-expanded', 'false');
  });

  it('sends a rate left at its defaults exactly as before', async () => {
    const user = userEvent.setup();
    const recorder = recordRequests();
    await openSettings(TAX);
    await user.click(await screen.findByRole('button', { name: 'Add tax rate' }));
    const dialog = dialogOf('Add tax rate');
    await user.selectOptions(dialog.getByRole('combobox', { name: 'Country' }), 'Japan (JP)');
    await user.type(dialog.getByRole('textbox', { name: 'Rate (%)' }), '10');
    await user.click(dialog.getByRole('button', { name: 'Add tax rate' }));
    expect(await screen.findByText('Tax rate for Japan added')).toBeInTheDocument();
    expect(recorder.to('POST', '/admin/tax-rates')[0].body).toEqual({
      country: 'JP',
      region: '',
      ratePercent: '10',
      taxType: 'vat',
      appliesTo: 'digital_services',
      label: '',
      ossScheme: '',
      validFrom: `${new Date().toISOString().slice(0, 10)}T00:00:00.000Z`,
      validTo: null,
    });
  });

  it('puts the server’s message under the end date', async () => {
    const user = userEvent.setup();
    mockServer.use(
      http.post('*/admin/tax-rates', () =>
        problem(422, 'VALIDATION_FAILED', 'Check the form', 'Some fields need attention.', [
          { field: 'validTo', message: 'The end date overlaps the next rate.' },
        ]),
      ),
    );
    await openSettings(TAX);
    await user.click(await screen.findByRole('button', { name: 'Add tax rate' }));
    const dialog = dialogOf('Add tax rate');
    await user.selectOptions(dialog.getByRole('combobox', { name: 'Country' }), 'France (FR)');
    await user.type(dialog.getByRole('textbox', { name: 'Rate (%)' }), '20');
    fireEvent.change(dialog.getByLabelText('Rate applies from'), { target: { value: '2026-01-01' } });
    // The end date is in the fold: type it there, close the fold, and the server's message opens it again.
    await user.click(dialog.getByRole('button', { name: 'More options' }));
    fireEvent.change(dialog.getByLabelText('Until'), { target: { value: '2026-12-31' } });
    await user.click(dialog.getByRole('button', { name: 'Hide more options' }));
    await user.click(dialog.getByRole('button', { name: 'Add tax rate' }));
    expect(await dialog.findByText('The end date overlaps the next rate.')).toBeVisible();
    expect(dialog.getByLabelText('Until')).toHaveAttribute('aria-invalid', 'true');
    expect(dialog.getByRole('button', { name: 'Hide more options' })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
  });
});

describe('Edit tax rate', () => {
  it('changes the rate and sends only that', async () => {
    const user = userEvent.setup();
    const recorder = recordRequests();
    await openSettings(TAX);
    await user.click(
      (await rowOf('Tax by country', 'United Kingdom')).getByRole('button', {
        name: 'Edit United Kingdom tax',
      }),
    );
    const dialog = dialogOf('Edit United Kingdom tax');
    // The country of a saved rate is shown, not offered.
    expect(dialog.queryByRole('combobox', { name: 'Country' })).not.toBeInTheDocument();
    expect(dialog.getByRole('group', { name: 'Country' })).toHaveTextContent('United Kingdom (GB)');
    expect(dialog.getByRole('textbox', { name: 'Rate (%)' })).toHaveValue('20');
    // UK VAT is reported through a scheme, a value of its own, so the fold starts open.
    expect(dialog.getByRole('textbox', { name: 'Reported through' })).toHaveValue('UK VAT');
    await user.clear(dialog.getByRole('textbox', { name: 'Rate (%)' }));
    await user.type(dialog.getByRole('textbox', { name: 'Rate (%)' }), '21');
    await user.click(dialog.getByRole('button', { name: 'Save changes' }));
    expect(await screen.findByText('Tax rate for United Kingdom saved')).toBeInTheDocument();
    expect(recorder.to('PATCH', '/admin/tax-rates/1')[0].body).toEqual({ ratePercent: '21' });
    expect((await getTaxRate(1)).ratePercent).toBe('21.0000');
    expect((await rowOf('Tax by country', 'United Kingdom')).getByText('21% VAT')).toBeInTheDocument();
  });

  it('says so when nothing changed', async () => {
    const user = userEvent.setup();
    await openSettings(TAX);
    await user.click(
      (await rowOf('Tax by country', 'Germany')).getByRole('button', { name: 'Edit Germany tax' }),
    );
    await user.click(dialogOf('Edit Germany tax').getByRole('button', { name: 'Save changes' }));
    expect(await screen.findByText('Nothing changed')).toBeInTheDocument();
  });
});

describe('permissions', () => {
  it('lets a reader see the rates but not add or edit them, and names the missing permission', async () => {
    await openSettings(TAX, { permissions: ['tax:read'] });
    const uk = await rowOf('Tax by country', 'United Kingdom');
    expect(uk.getByRole('button', { name: 'Edit United Kingdom tax' })).toBeDisabled();
    const add = screen.getByRole('button', { name: 'Add tax rate' });
    expect(add).toBeDisabled();
    expect(add).toHaveAttribute('title', 'You need the tax:create permission');
  });

  it('lets a role with tax:* change them', async () => {
    await openSettings(TAX, { permissions: ['tax:*'] });
    expect(await screen.findByRole('button', { name: 'Add tax rate' })).toBeEnabled();
  });
});
