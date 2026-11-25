// Tests for the Invoices view and the Issue invoice view (Books), run through the whole app against the dev mock API: the list with filters
// and the drawer, issuing a manual invoice as a full view (success opens its drawer, the server’s refusal under its field, the question
// asked before typing is left behind) and what the staff member’s permissions allow.
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { delay, http, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import { mockServer } from '@/mocks/node';
import { setupMockApi } from '@/test/renderApp';
import { moneyLink, openFinance, rowWith, tableNamed } from '../test/financePage';

setupMockApi();
vi.setConfig({ testTimeout: 20_000 });

describe('the list', () => {
  it('lists the newest invoices first with who they are billed to, their kind, total and status', async () => {
    const user = userEvent.setup();
    await openFinance('/money?view=invoices');
    const table = await tableNamed('Invoices');
    expect(await table.findAllByRole('row')).toHaveLength(26);
    expect(await screen.findByText('71 invoices')).toBeInTheDocument();
    // The top-up invoices of store balances push the oldest manual invoice off the first page: find it by kind.
    await user.selectOptions(screen.getByRole('combobox', { name: 'Filter by kind' }), 'manual');
    const manual = await rowWith('Invoices', '$900.00');
    expect(manual.getByText('Manual')).toBeInTheDocument();
    expect(manual.getByText('$900.00')).toBeInTheDocument();
    expect(manual.getByText('Open')).toBeInTheDocument();
    expect(manual.getByRole('link', { name: 'Istanbul GSM Care' })).toHaveAttribute(
      'href',
      '/accounts/11?tab=wallet',
    );
  });

  it('masks the email of a storefront customer on a tax receipt', async () => {
    const user = userEvent.setup();
    await openFinance('/money?view=invoices');
    await user.selectOptions(await screen.findByRole('combobox', { name: 'Filter by kind' }), 'receipt');
    expect(await screen.findByText('12 invoices')).toBeInTheDocument();
    const rows = (await tableNamed('Invoices')).getAllByRole('row');
    expect(rows[1]).toHaveTextContent(/•••@/);
    expect(rows[1]).toHaveTextContent('Tax receipt');
  });

  it('filters by status through the server and keeps it in the address', async () => {
    const user = userEvent.setup();
    const app = await openFinance('/money?view=invoices');
    await screen.findByText('71 invoices');
    await user.selectOptions(screen.getByRole('combobox', { name: 'Filter by status' }), 'void');
    expect(app.location()).toBe('/money?view=invoices&status=void');
    expect(await screen.findByText('2 invoices')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Clear filters' }));
    expect(app.location()).toBe('/money?view=invoices');
    expect(await screen.findByText('71 invoices')).toBeInTheDocument();
  });

  it('searches by number after a pause', async () => {
    const user = userEvent.setup();
    const app = await openFinance('/money?view=invoices');
    await screen.findByText('71 invoices');
    const box = screen.getByRole('searchbox', { name: 'Search number or account' });
    await user.type(box, 'Istanbul');
    await waitFor(() => expect(app.location()).toBe('/money?view=invoices&q=Istanbul'));
    await waitFor(() => expect(screen.queryByText('71 invoices')).not.toBeInTheDocument());
    const rows = (await tableNamed('Invoices')).getAllByRole('row').slice(1);
    expect(rows.every((row) => row.textContent?.includes('Istanbul GSM Care'))).toBe(true);

    await user.clear(box);
    await user.type(box, 'no such merchant');
    expect(await screen.findByText('No invoices match')).toBeInTheDocument();
  });

  it('opens an invoice in a drawer with the amounts the server worked out', async () => {
    const user = userEvent.setup();
    const app = await openFinance('/money?view=invoices&kind=receipt');
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
    await openFinance('/money?view=invoices&invoice=1');
    expect(await screen.findByRole('dialog', { name: /^INV-\d{4}-0001$/ })).toBeInTheDocument();
  });
});

describe('the Issue invoice view', () => {
  const ISSUE = '/money?view=issue-invoice';

  // Opens the view and waits until the merchant menu holds the merchant-rank accounts (slow under a full parallel run).
  async function openForm(options: { permissions?: string[] } = {}) {
    const app = await openFinance(ISSUE, options);
    await screen.findByRole('option', { name: 'Zain Mobile Hub' }, { timeout: 10_000 });
    return { app, user: userEvent.setup() };
  }
  const merchant = () => screen.getByRole('combobox', { name: 'Merchant' });
  const amount = () => screen.getByRole('textbox', { name: 'Amount (USD)' });
  const purpose = () => screen.getByRole('textbox', { name: 'What it is for' });
  const issueButton = () => screen.getByRole('button', { name: 'Issue invoice' });

  it('bills a merchant: the toast names the invoice and its drawer opens on the Invoices view', async () => {
    let body: unknown;
    mockServer.use(
      http.post('*/admin/invoices', async ({ request }) => {
        body = await request.clone().json();
        return undefined;
      }),
    );
    const { app, user } = await openForm();
    await user.selectOptions(merchant(), 'Zain Mobile Hub');
    await user.type(amount(), '125.5');
    await user.type(purpose(), 'Setup fee');
    await user.click(issueButton());

    expect(await screen.findByText(/^Invoice INV-\d{4}-0072 issued$/)).toBeInTheDocument();
    expect(screen.getByText('$125.50 billed to Zain Mobile Hub.')).toBeInTheDocument();
    expect(body).toEqual({ clientId: 1, amount: '125.5000', description: 'Setup fee' });
    // The new invoice opens in its drawer on the Invoices view.
    expect(await screen.findByRole('dialog', { name: /^INV-\d{4}-0072$/ })).toBeInTheDocument();
    expect(app.location()).toMatch(/^\/money\?view=invoices&invoice=\d+$/);
    expect(await screen.findByText('72 invoices')).toBeInTheDocument();
  });

  it('sends one request when the form is submitted twice at once (a fast double click, Enter twice)', async () => {
    let posts = 0;
    mockServer.use(
      http.post('*/admin/invoices', async () => {
        posts += 1;
        await delay(150);
        return undefined;
      }),
    );
    const { user } = await openForm();
    await user.selectOptions(merchant(), 'Zain Mobile Hub');
    await user.type(amount(), '125.5');
    await user.type(purpose(), 'Setup fee');
    // Two submit events in the same tick: the form's own checks are asynchronous, so both pass them before the first request is sent.
    const form = issueButton().closest('form') as HTMLFormElement;
    fireEvent.submit(form);
    fireEvent.submit(form);
    expect(await screen.findByText(/^Invoice INV-\d{4}-0072 issued$/)).toBeInTheDocument();
    expect(posts).toBe(1);
  });

  it('shows the button busy while the request runs, and sends again after a refusal', async () => {
    let posts = 0;
    mockServer.use(
      http.post('*/admin/invoices', async () => {
        posts += 1;
        await delay(100);
        if (posts > 1) return undefined;
        return HttpResponse.json(
          { title: 'Cannot bill', status: 409, code: 'CONFLICT', detail: 'Try again in a moment.' },
          { status: 409, headers: { 'Content-Type': 'application/problem+json' } },
        );
      }),
    );
    const { user } = await openForm();
    await user.selectOptions(merchant(), 'Zain Mobile Hub');
    await user.type(amount(), '10');
    await user.type(purpose(), 'Setup fee');
    await user.click(issueButton());
    expect(issueButton()).toHaveAttribute('aria-busy', 'true');
    expect(await screen.findByRole('alert')).toHaveTextContent('Try again in a moment.');
    // The refusal frees the form: a second press sends a second request.
    await waitFor(() => expect(issueButton()).toBeEnabled());
    await user.click(issueButton());
    expect(await screen.findByText(/^Invoice INV-\d{4}-0072 issued$/)).toBeInTheDocument();
    expect(posts).toBe(2);
  });

  it('offers only the accounts of a merchant rank, asked of the accounts list', async () => {
    let asked: URL | undefined;
    mockServer.use(
      http.get('*/admin/clients', ({ request }) => {
        asked ??= new URL(request.url);
        return undefined;
      }),
    );
    await openForm();
    expect(asked?.searchParams.get('rankKind')).toBe('merchant');
    const names = within(merchant())
      .getAllByRole('option')
      .map((option) => option.textContent);
    expect(names).toHaveLength(21); // the prompt and the twenty merchant-rank accounts
    expect(names).not.toContain('Lukas Brandt');
  });

  it('shows the refusal of a retail account under the merchant field and stays on the view', async () => {
    mockServer.use(
      http.post('*/admin/invoices', () =>
        HttpResponse.json(
          {
            title: 'Check the form',
            status: 422,
            code: 'VALIDATION_FAILED',
            detail: 'Some fields need attention.',
            errors: [
              {
                field: 'clientId',
                code: 'not_merchant',
                message: 'Only an account with a merchant rank can be billed.',
              },
            ],
          },
          { status: 422, headers: { 'Content-Type': 'application/problem+json' } },
        ),
      ),
    );
    const { app, user } = await openForm();
    await user.selectOptions(merchant(), 'Zain Mobile Hub');
    await user.type(amount(), '10');
    await user.type(purpose(), 'Setup fee');
    await user.click(issueButton());
    expect(
      await screen.findByText('Only an account with a merchant rank can be billed.'),
    ).toBeInTheDocument();
    expect(app.location()).toBe(ISSUE);
  });

  it('checks the fields before it asks the server', async () => {
    const { user } = await openForm();
    await user.click(issueButton());
    expect(await screen.findByText('Choose the merchant to bill.')).toBeInTheDocument();
    expect(screen.getByText('Enter an amount, for example 125.50.')).toBeInTheDocument();
    expect(screen.getByText('Say what the invoice is for.')).toBeInTheDocument();

    await user.type(amount(), '0');
    await user.click(issueButton());
    expect(await screen.findByText('Enter an amount greater than zero.')).toBeInTheDocument();
  });

  it('shows the server’s refusal under the field it names and keeps the typing', async () => {
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
    const { app, user } = await openForm();
    await user.selectOptions(merchant(), 'Zain Mobile Hub');
    await user.type(amount(), '99999999');
    await user.type(purpose(), 'Too much');
    await user.click(issueButton());
    expect(await screen.findByText('The amount is above the invoice limit.')).toBeInTheDocument();
    expect(app.location()).toBe(ISSUE);
    expect(amount()).toHaveValue('99999999');
  });

  it('shows what the server said beside the button when it names no field', async () => {
    mockServer.use(
      http.post('*/admin/invoices', () =>
        HttpResponse.json(
          {
            title: 'Cannot bill',
            status: 409,
            code: 'CONFLICT',
            detail: 'This merchant has no billing country.',
          },
          { status: 409, headers: { 'Content-Type': 'application/problem+json' } },
        ),
      ),
    );
    const { user } = await openForm();
    await user.selectOptions(merchant(), 'Zain Mobile Hub');
    await user.type(amount(), '10');
    await user.type(purpose(), 'Setup fee');
    await user.click(issueButton());
    expect(await screen.findByRole('alert')).toHaveTextContent('This merchant has no billing country.');
  });

  it('asks before the view is left with typing in it', async () => {
    const { app, user } = await openForm();
    await user.type(amount(), '10');
    await user.click(await moneyLink('Invoices'));
    const dialog = within(await screen.findByRole('dialog', { name: 'Discard your unsaved changes?' }));
    await user.click(dialog.getByRole('button', { name: 'Keep editing' }));
    expect(app.location()).toBe(ISSUE);
    await user.click(screen.getByRole('link', { name: 'Invoices' }));
    await user.click(
      within(await screen.findByRole('dialog', { name: 'Discard your unsaved changes?' })).getByRole(
        'button',
        {
          name: 'Discard changes',
        },
      ),
    );
    await waitFor(() => expect(app.location()).toBe('/money?view=invoices'));
  });

  it('is not offered without invoices:create or clients:read: the Invoices view shows instead', async () => {
    await openFinance(ISSUE, { permissions: ['invoices:read', 'invoices:create'] });
    expect(await screen.findByRole('table', { name: 'Invoices' })).toBeInTheDocument();
    expect(await moneyLink('Invoices')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Issue invoice/ })).not.toBeInTheDocument();
  });

  it('is offered, and has no button on the list, for a role that may issue invoices', async () => {
    await openFinance('/money?view=invoices');
    expect(await moneyLink(/Issue invoice/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Issue manual invoice/ })).not.toBeInTheDocument();
  });
});
