// Tests for the "Tax by country" panel of the Tax and currency tab, run through the whole app against the dev mock API: the table with its
// effective dates, add a rate (including one that starts later), edit with only the changes sent, the server's field errors, permissions.
import { fireEvent, screen } from '@testing-library/react';
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
    await user.type(dialog.getByRole('textbox', { name: 'Country code' }), 'gb');
    await user.type(dialog.getByRole('textbox', { name: 'Rate (%)' }), '22');
    fireEvent.change(dialog.getByLabelText('Rate applies from'), { target: { value: '2099-01-01' } });
    await user.type(dialog.getByRole('textbox', { name: 'Reported through' }), 'UK VAT');
    await user.click(dialog.getByRole('button', { name: 'Add tax rate' }));
    expect(await screen.findByText('Tax rate for United Kingdom added')).toBeInTheDocument();
    expect(recorder.to('POST', '/admin/tax-rates')[0].body).toMatchObject({
      country: 'GB',
      ratePercent: '22',
      taxType: 'vat',
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
    expect(await dialog.findByText('Enter the two-letter country code.')).toBeInTheDocument();
    expect(dialog.getByText('Enter a rate from 0 to 100.')).toBeInTheDocument();
    expect(dialog.getByText('Enter the date the rate starts.')).toBeInTheDocument();
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
    await user.type(dialog.getByRole('textbox', { name: 'Country code' }), 'FR');
    await user.type(dialog.getByRole('textbox', { name: 'Rate (%)' }), '20');
    fireEvent.change(dialog.getByLabelText('Rate applies from'), { target: { value: '2026-01-01' } });
    fireEvent.change(dialog.getByLabelText('Until'), { target: { value: '2026-12-31' } });
    await user.click(dialog.getByRole('button', { name: 'Add tax rate' }));
    expect(await dialog.findByText('The end date overlaps the next rate.')).toBeInTheDocument();
    expect(dialog.getByLabelText('Until')).toHaveAttribute('aria-invalid', 'true');
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
    expect(dialog.getByRole('textbox', { name: 'Country code' })).toHaveAttribute('readonly');
    expect(dialog.getByRole('textbox', { name: 'Rate (%)' })).toHaveValue('20');
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
