// Tests for the Invoices tab, run through the whole app against the dev mock API: the list with filters, the drawer, issuing a
// manual invoice (success, and the server’s refusal under its field) and what the staff member’s permissions allow.
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import { mockServer } from '@/mocks/node';
import { setupMockApi } from '@/test/renderApp';
import { openFinance, rowWith, tableNamed } from '../test/financePage';

setupMockApi();
vi.setConfig({ testTimeout: 20_000 });

describe('the list', () => {
  it('lists the newest invoices first with who they are billed to, their kind, total and status', async () => {
    await openFinance('/finance?tab=invoices');
    const table = await tableNamed('Invoices');
    expect(await table.findAllByRole('row')).toHaveLength(26);
    expect(await screen.findByText('69 invoices')).toBeInTheDocument();
    const manual = await rowWith('Invoices', '$900.00');
    expect(manual.getByText('Manual')).toBeInTheDocument();
    expect(manual.getByText('$900.00')).toBeInTheDocument();
    expect(manual.getByText('Open')).toBeInTheDocument();
    expect(manual.getByRole('link', { name: 'Istanbul GSM Care' })).toHaveAttribute('href', '/merchants/11');
  });

  it('masks the email of a storefront customer on a tax receipt', async () => {
    const user = userEvent.setup();
    await openFinance('/finance?tab=invoices');
    await user.selectOptions(await screen.findByRole('combobox', { name: 'Filter by kind' }), 'receipt');
    expect(await screen.findByText('12 invoices')).toBeInTheDocument();
    const rows = (await tableNamed('Invoices')).getAllByRole('row');
    expect(rows[1]).toHaveTextContent(/•••@/);
    expect(rows[1]).toHaveTextContent('Tax receipt');
  });

  it('filters by status through the server and keeps it in the address', async () => {
    const user = userEvent.setup();
    const app = await openFinance('/finance?tab=invoices');
    await screen.findByText('69 invoices');
    await user.selectOptions(screen.getByRole('combobox', { name: 'Filter by status' }), 'void');
    expect(app.location()).toBe('/finance?tab=invoices&status=void');
    expect(await screen.findByText('2 invoices')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Clear filters' }));
    expect(app.location()).toBe('/finance?tab=invoices');
    expect(await screen.findByText('69 invoices')).toBeInTheDocument();
  });

  it('searches by number after a pause', async () => {
    const user = userEvent.setup();
    const app = await openFinance('/finance?tab=invoices');
    await screen.findByText('69 invoices');
    const box = screen.getByRole('searchbox', { name: 'Search number or merchant' });
    await user.type(box, 'Istanbul');
    await waitFor(() => expect(app.location()).toBe('/finance?tab=invoices&q=Istanbul'));
    await waitFor(() => expect(screen.queryByText('69 invoices')).not.toBeInTheDocument());
    const rows = (await tableNamed('Invoices')).getAllByRole('row').slice(1);
    expect(rows.every((row) => row.textContent?.includes('Istanbul GSM Care'))).toBe(true);

    await user.clear(box);
    await user.type(box, 'no such merchant');
    expect(await screen.findByText('No invoices match')).toBeInTheDocument();
  });

  it('opens an invoice in a drawer with the amounts the server worked out', async () => {
    const user = userEvent.setup();
    const app = await openFinance('/finance?tab=invoices&kind=receipt');
    const first = (await tableNamed('Invoices')).getAllByRole('row')[1];
    const number = within(first).getAllByRole('button')[0];
    await user.click(number);
    expect(app.location()).toMatch(/invoice=\d+/);
    const drawer = within(await screen.findByRole('dialog', { name: number.textContent as string }));
    expect(drawer.getByText('Tax receipt')).toBeInTheDocument();
    expect(drawer.getAllByText('Paid').length).toBeGreaterThan(0);
    expect(drawer.getByText('VAT')).toBeInTheDocument();
    expect(drawer.getByText('Total')).toBeInTheDocument();
    expect(drawer.getByRole('link', { name: /^#\d+$/ })).toHaveAttribute(
      'href',
      expect.stringMatching(/^\/orders\?order=\d+$/),
    );
    expect(drawer.getByRole('link', { name: 'Download the PDF' })).toHaveAttribute(
      'href',
      expect.stringContaining('/admin/files/'),
    );
  });

  it('opens an invoice that is not on the page from a link', async () => {
    await openFinance('/finance?tab=invoices&invoice=1');
    expect(await screen.findByRole('dialog', { name: /^INV-\d{4}-0001$/ })).toBeInTheDocument();
  });
});

describe('Issue manual invoice', () => {
  it('bills a merchant: the invoice is created, the toast names it and the list grows', async () => {
    const user = userEvent.setup();
    let body: unknown;
    mockServer.use(
      http.post('*/admin/invoices', async ({ request }) => {
        body = await request.clone().json();
        return undefined;
      }),
    );
    await openFinance('/finance?tab=invoices');
    await screen.findByText('69 invoices');
    await user.click(screen.getByRole('button', { name: 'Issue manual invoice' }));
    const dialog = within(await screen.findByRole('dialog', { name: 'Issue manual invoice' }));
    await user.selectOptions(await dialog.findByLabelText('Merchant'), 'Zain Mobile Hub');
    await user.type(dialog.getByLabelText('Amount (USD)'), '125.5');
    await user.type(dialog.getByLabelText('What it is for'), 'Setup fee');
    await user.click(dialog.getByRole('button', { name: 'Issue invoice' }));

    expect(await screen.findByText(/^Invoice INV-\d{4}-0070 issued$/)).toBeInTheDocument();
    expect(screen.getByText('$125.50 billed to Zain Mobile Hub.')).toBeInTheDocument();
    expect(body).toEqual({ clientId: 1, amount: '125.5000', description: 'Setup fee' });
    expect(await screen.findByText('70 invoices')).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: 'Issue manual invoice' })).not.toBeInTheDocument(),
    );
  });

  it('checks the fields before it asks the server', async () => {
    const user = userEvent.setup();
    await openFinance('/finance?tab=invoices');
    await user.click(await screen.findByRole('button', { name: 'Issue manual invoice' }));
    const dialog = within(await screen.findByRole('dialog', { name: 'Issue manual invoice' }));
    await user.click(dialog.getByRole('button', { name: 'Issue invoice' }));
    expect(await dialog.findByText('Choose the merchant to bill.')).toBeInTheDocument();
    expect(dialog.getByText('Enter an amount, for example 125.50.')).toBeInTheDocument();
    expect(dialog.getByText('Say what the invoice is for.')).toBeInTheDocument();

    await user.type(dialog.getByLabelText('Amount (USD)'), '0');
    await user.click(dialog.getByRole('button', { name: 'Issue invoice' }));
    expect(await dialog.findByText('Enter an amount greater than zero.')).toBeInTheDocument();
  });

  it('shows the server’s refusal under the field it names and keeps the dialog open', async () => {
    const user = userEvent.setup();
    mockServer.use(
      http.post('*/admin/invoices', () =>
        HttpResponse.json(
          {
            title: 'Check the form',
            status: 422,
            code: 'VALIDATION_FAILED',
            detail: 'Some fields need attention.',
            errors: [{ field: 'amount', message: 'The amount is above the invoice limit.' }],
          },
          { status: 422, headers: { 'Content-Type': 'application/problem+json' } },
        ),
      ),
    );
    await openFinance('/finance?tab=invoices');
    await user.click(await screen.findByRole('button', { name: 'Issue manual invoice' }));
    const dialog = within(await screen.findByRole('dialog', { name: 'Issue manual invoice' }));
    await user.selectOptions(await dialog.findByLabelText('Merchant'), 'Zain Mobile Hub');
    await user.type(dialog.getByLabelText('Amount (USD)'), '99999999');
    await user.type(dialog.getByLabelText('What it is for'), 'Too much');
    await user.click(dialog.getByRole('button', { name: 'Issue invoice' }));
    expect(await dialog.findByText('The amount is above the invoice limit.')).toBeInTheDocument();
    expect(screen.getByRole('dialog', { name: 'Issue manual invoice' })).toBeInTheDocument();
  });

  it('is disabled, with the missing permission in its title, without invoices:create or clients:read', async () => {
    await openFinance('/finance?tab=invoices', { permissions: ['invoices:read'] });
    const button = await screen.findByRole('button', { name: 'Issue manual invoice' });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('title', 'You need the invoices:create permission');
  });

  it('asks for clients:read too, since the merchant names come from it', async () => {
    await openFinance('/finance?tab=invoices', { permissions: ['invoices:read', 'invoices:create'] });
    const button = await screen.findByRole('button', { name: 'Issue manual invoice' });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('title', 'You need the clients:read permission');
  });
});
