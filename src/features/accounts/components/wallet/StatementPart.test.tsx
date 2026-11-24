// Tests for the Statement part of an account's record, run through the whole app against the dev mock API: the ledger with its running balance,
// the pager at the foot, the sort, the day range of the Quick Search box, the journal behind a line, the order link, and the states of the part.
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import { mockServer } from '@/mocks/node';
import { problem } from '@/mocks/problem';
import { setupMockApi } from '@/test/renderApp';
import { renderAccount } from '../../pages/test-utils';
import { installAccountMocks } from '../../test/installAccountMocks';

setupMockApi();
installAccountMocks();
// The page is a lazy chunk and the first test of a run waits for its modules, which is slow while the whole suite runs in parallel.
vi.setConfig({ testTimeout: 30_000 });

const ZAIN = /Zain Mobile Hub/; // 1: a merchant wallet with 141 lines in its statement
const DANIEL = /Daniel Whitmore/; // 101: a store balance with one $50 top-up line

const table = () => screen.findByRole('table', { name: 'Statement' });
const rowsOf = (view: { getAllByRole: (role: 'row') => HTMLElement[] }) => view.getAllByRole('row').slice(1);

/** Records the query of every statement read, then lets the mock answer as usual. */
function recordReads(): URLSearchParams[] {
  const seen: URLSearchParams[] = [];
  mockServer.use(
    http.get('*/admin/clients/:id/statement', ({ request }) => {
      seen.push(new URL(request.url).searchParams);
      return undefined;
    }),
  );
  return seen;
}

const empty = () =>
  http.get('*/admin/clients/:id/statement', () =>
    HttpResponse.json([], {
      headers: { 'x-total-count': '0', 'access-control-expose-headers': 'x-total-count' },
    }),
  );

describe('the ledger', () => {
  it('lists the lines newest first with the running balance, fifty to a page, and the pager at the foot', async () => {
    const user = userEvent.setup();
    await renderAccount(1, ZAIN, { tab: 'statement' });
    const view = within(await table());
    await waitFor(() => expect(view.getAllByRole('row')).toHaveLength(51));
    // Newest first: the top line ends at the balance of the wallet.
    expect(rowsOf(view)[0]).toHaveTextContent('$1,209.75');
    expect(view.getAllByRole('columnheader').map((header) => header.textContent)).toEqual([
      'When',
      'Type',
      'Memo',
      'Amount',
      'Balance',
      'Journal',
    ]);
    expect(await screen.findByText('Results: 1 - 50 of 141')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Next page' }));
    expect(await screen.findByText('Results: 51 - 100 of 141')).toBeInTheDocument();
  });

  it('writes money in as +$ and money out as -$, with the type of each line', async () => {
    await renderAccount(1, ZAIN, { tab: 'statement' });
    const view = within(await table());
    await waitFor(() => expect(view.getAllByRole('row')).toHaveLength(51));
    const rows = rowsOf(view);
    expect(rows.some((line) => within(line).queryByText(/^\+\$/))).toBe(true);
    expect(rows.some((line) => within(line).queryByText(/^-\$/))).toBe(true);
    expect(
      within(rows[0]).getByText(/^(Order settled|Hold released|Order hold|Deposit|Adjustment)$/),
    ).toBeInTheDocument();
  });

  it('sorts on the server when the When header is pressed, and goes back to the first page', async () => {
    const user = userEvent.setup();
    const seen = recordReads();
    await renderAccount(1, ZAIN, { tab: 'statement' });
    const view = within(await table());
    await waitFor(() => expect(view.getAllByRole('row')).toHaveLength(51));
    const newest = rowsOf(view)[0].textContent;
    await user.click(await screen.findByRole('button', { name: 'When' }));
    await waitFor(() => expect(rowsOf(view)[0].textContent).not.toBe(newest));
    expect(screen.getByRole('columnheader', { name: /When/ })).toHaveAttribute('aria-sort', 'ascending');
    expect(seen.at(-1)?.get('_order')).toBe('asc');
    expect(seen.at(-1)?.get('_sort')).toBe('createdAt');
  });

  it('asks for another page size and starts over at the first page', async () => {
    const user = userEvent.setup();
    const seen = recordReads();
    await renderAccount(1, ZAIN, { tab: 'statement' });
    await screen.findByText('Results: 1 - 50 of 141');
    await user.click(screen.getByRole('button', { name: 'Next page' }));
    await screen.findByText('Results: 51 - 100 of 141');
    await user.selectOptions(screen.getByLabelText('Page size:'), '25');
    expect(await screen.findByText('Results: 1 - 25 of 141')).toBeInTheDocument();
    expect(seen.at(-1)?.get('_start')).toBe('0');
    expect(seen.at(-1)?.get('_end')).toBe('25');
  });

  it('shows the store balance of a retail account the same way', async () => {
    await renderAccount(101, DANIEL, { tab: 'statement' });
    const view = within(await table());
    await waitFor(() => expect(view.getAllByRole('row')).toHaveLength(2));
    expect(view.getByText(/Top-up PAY-2001/)).toBeInTheDocument();
    expect(view.getByText('+$50.00')).toBeInTheDocument();
    expect(view.getByText('Deposit')).toBeInTheDocument();
  });

  it('shows a balance below zero in the critical colour, with the alert', async () => {
    mockServer.use(
      http.get('*/admin/clients/:id/statement', () =>
        HttpResponse.json(
          [
            {
              id: 1,
              transactionId: 7,
              kind: 'order_hold',
              memo: 'Hold for order 48100',
              amount: '-81.9500',
              balanceAfter: '-81.9500',
              createdAt: '2026-11-01T10:00:00.000Z',
            },
          ],
          { headers: { 'x-total-count': '1', 'access-control-expose-headers': 'x-total-count' } },
        ),
      ),
    );
    await renderAccount(17, /Sana'a Repair/, { tab: 'statement' });
    const view = within(await table());
    const balance = await view.findByText('-$81.95', { selector: 'span.text-crit-fg' });
    expect(balance.querySelector('svg')).not.toBeNull();
    expect(view.getAllByText('-$81.95')).toHaveLength(2);
  });

  it('links the order of a line, when it names one', async () => {
    mockServer.use(
      http.get('*/admin/clients/:id/statement', () =>
        HttpResponse.json(
          [
            {
              id: 1,
              transactionId: 7,
              kind: 'order_settle',
              memo: 'Settled order',
              amount: '-12.0000',
              balanceAfter: '88.0000',
              createdAt: '2026-11-01T10:00:00.000Z',
              orderId: 48100,
            },
          ],
          { headers: { 'x-total-count': '1', 'access-control-expose-headers': 'x-total-count' } },
        ),
      ),
    );
    await renderAccount(101, DANIEL, { tab: 'statement' });
    const view = within(await table());
    expect(await view.findByRole('link', { name: 'Order #48100' })).toHaveAttribute(
      'href',
      '/orders?order=48100',
    );
  });
});

describe('the Quick Search box', () => {
  it('asks for the days only when Search is pressed, as the first and the last moment of the days in UTC', async () => {
    const user = userEvent.setup();
    const seen = recordReads();
    await renderAccount(1, ZAIN, { tab: 'statement' });
    await screen.findByText('Results: 1 - 50 of 141');
    const before = seen.length;
    const box = within(screen.getByRole('group', { name: 'Quick Search' }));
    await user.type(box.getByLabelText('From'), '2026-11-01');
    await user.type(box.getByLabelText('To'), '2026-11-10');
    // A draft until Search: nothing was asked yet.
    expect(seen).toHaveLength(before);
    await user.click(box.getByRole('button', { name: 'Search' }));
    await waitFor(() => expect(seen.length).toBeGreaterThan(before));
    expect(seen.at(-1)?.get('createdAt_gte')).toBe('2026-11-01T00:00:00.000Z');
    expect(seen.at(-1)?.get('createdAt_lte')).toBe('2026-11-10T23:59:59.999Z');
    expect(seen.at(-1)?.get('_start')).toBe('0');
  });

  it('says the end is before the start under To, and does not search until the range is the right way round', async () => {
    const user = userEvent.setup();
    const seen = recordReads();
    await renderAccount(1, ZAIN, { tab: 'statement' });
    await screen.findByText('Results: 1 - 50 of 141');
    const before = seen.length;
    const box = within(screen.getByRole('group', { name: 'Quick Search' }));
    await user.type(box.getByLabelText('From'), '2026-11-10');
    await user.type(box.getByLabelText('To'), '2026-11-01');
    expect(box.getByText('The end is before the start')).toBeInTheDocument();
    expect(box.getByLabelText('To')).toBeInvalid();
    expect(box.getByRole('button', { name: 'Search' })).toBeDisabled();
    await user.type(box.getByLabelText('To'), '{Enter}');
    expect(seen).toHaveLength(before);
    await user.clear(box.getByLabelText('To'));
    await user.type(box.getByLabelText('To'), '2026-11-12');
    expect(box.queryByText('The end is before the start')).not.toBeInTheDocument();
    expect(box.getByRole('button', { name: 'Search' })).toBeEnabled();
  });

  it('searches on Enter too', async () => {
    const user = userEvent.setup();
    const seen = recordReads();
    await renderAccount(1, ZAIN, { tab: 'statement' });
    await screen.findByText('Results: 1 - 50 of 141');
    const box = within(screen.getByRole('group', { name: 'Quick Search' }));
    await user.type(box.getByLabelText('From'), '2026-11-01{Enter}');
    await waitFor(() => expect(seen.at(-1)?.get('createdAt_gte')).toBe('2026-11-01T00:00:00.000Z'));
    expect(seen.at(-1)?.get('createdAt_lte')).toBeNull();
  });
});

describe('the Wallet menu and the official statement', () => {
  const menu = () => screen.getByRole('combobox', { name: 'Wallet' });
  const download = () => screen.queryByRole('button', { name: 'Download official statement' });

  it('reads the live wallet at first (no wallet key), then the history of a wallet the account left behind, from the first page', async () => {
    const user = userEvent.setup();
    const seen = recordReads();
    await renderAccount(101, DANIEL, { tab: 'statement' });
    await screen.findByText('Results: 1 - 1 of 1');
    expect(menu()).toHaveValue('live');
    expect(Array.from(menu().querySelectorAll('option'), (option) => option.textContent)).toEqual([
      'Live wallet',
      'Merchant wallet',
      'Store balance',
    ]);
    expect(seen.every((query) => !query.has('wallet'))).toBe(true);
    const before = seen.length;
    await user.selectOptions(menu(), 'Merchant wallet');
    await waitFor(() => expect(seen.length).toBeGreaterThan(before));
    expect(seen.at(-1)?.get('wallet')).toBe('merchant');
    expect(seen.at(-1)?.get('_start')).toBe('0');
    await user.selectOptions(menu(), 'Store balance');
    await waitFor(() => expect(seen.at(-1)?.get('wallet')).toBe('store'));
    await user.selectOptions(menu(), 'Live wallet');
    await waitFor(() => expect(seen.at(-1)?.has('wallet')).toBe(false));
  });

  it('keeps the other days of the Quick Search box when the wallet changes', async () => {
    const user = userEvent.setup();
    const seen = recordReads();
    await renderAccount(1, ZAIN, { tab: 'statement' });
    await screen.findByText('Results: 1 - 50 of 141');
    const box = within(screen.getByRole('group', { name: 'Quick Search' }));
    await user.type(box.getByLabelText('From'), '2026-11-01');
    await user.click(box.getByRole('button', { name: 'Search' }));
    await waitFor(() => expect(seen.at(-1)?.get('createdAt_gte')).toBe('2026-11-01T00:00:00.000Z'));
    await user.selectOptions(menu(), 'Store balance');
    await waitFor(() => expect(seen.at(-1)?.get('wallet')).toBe('store'));
    expect(seen.at(-1)?.get('createdAt_gte')).toBe('2026-11-01T00:00:00.000Z');
  });

  it('offers the official statement while a merchant wallet is shown: the live one of a merchant, or the one a retail account left behind', async () => {
    const user = userEvent.setup();
    await renderAccount(1, ZAIN, { tab: 'statement' });
    await screen.findByText('Results: 1 - 50 of 141');
    expect(download()).toBeInTheDocument();
    await user.selectOptions(menu(), 'Store balance');
    await waitFor(() => expect(download()).not.toBeInTheDocument());
    await user.selectOptions(menu(), 'Merchant wallet');
    await waitFor(() => expect(download()).toBeInTheDocument());
  });

  it('draws no download for the live store balance of a retail account, and draws it once the merchant wallet is chosen', async () => {
    const user = userEvent.setup();
    await renderAccount(101, DANIEL, { tab: 'statement' });
    await screen.findByText('Results: 1 - 1 of 1');
    expect(download()).not.toBeInTheDocument();
    await user.selectOptions(menu(), 'Merchant wallet');
    await waitFor(() => expect(download()).toBeInTheDocument());
  });

  it('asks the server for the official statement of that account and says what the server refuses', async () => {
    const user = userEvent.setup();
    const asked: string[] = [];
    mockServer.use(
      http.get('*/admin/reports/client-statement/:clientId', ({ request }) => {
        asked.push(new URL(request.url).pathname);
        return problem(409, 'CONFLICT', 'No statement', 'This account never had a merchant wallet.');
      }),
    );
    await renderAccount(101, DANIEL, { tab: 'statement' });
    await screen.findByText('Results: 1 - 1 of 1');
    await user.selectOptions(menu(), 'Merchant wallet');
    await user.click(await screen.findByRole('button', { name: 'Download official statement' }));
    expect(await screen.findByText('No statement')).toBeInTheDocument();
    expect(screen.getByText(/This account never had a merchant wallet\./)).toBeInTheDocument();
    expect(asked).toEqual(['/admin/reports/client-statement/101']);
  });

  it('turns the download off without reports:read, naming the permission', async () => {
    await renderAccount(1, ZAIN, { permissions: ['clients:read', 'wallet:read'], tab: 'statement' });
    const button = await screen.findByRole('button', { name: 'Download official statement' });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('title', 'You need the reports:read permission');
  });
});

describe('the journal', () => {
  it('opens the journal behind a line with its accounts, debits and credits, and closes', async () => {
    const user = userEvent.setup();
    await renderAccount(1, ZAIN, { tab: 'statement' });
    const [first] = await screen.findAllByRole('button', { name: /^View journal JRN-\d{5}$/ });
    await user.click(first);
    const dialog = await screen.findByRole('dialog', { name: /^JRN-\d{5} · / });
    expect(await within(dialog).findByText('client_wallet')).toBeInTheDocument();
    expect(within(dialog).getByText('Debits equal credits in each journal.')).toBeInTheDocument();
    expect(within(dialog).getByRole('columnheader', { name: 'Debit' })).toBeInTheDocument();
    expect(within(dialog).getByText('Total')).toBeInTheDocument();
    await user.click(within(dialog).getAllByRole('button', { name: 'Close' }).at(-1)!);
    await waitFor(() => expect(screen.queryByRole('dialog', { name: /^JRN-/ })).not.toBeInTheDocument());
  });

  it('opens the journal of a store balance, which names the store balance account', async () => {
    const user = userEvent.setup();
    await renderAccount(101, DANIEL, { tab: 'statement' });
    await user.click(await screen.findByRole('button', { name: /^View journal/ }));
    const dialog = await screen.findByRole('dialog', { name: /Top-up PAY-2001/ });
    expect(await within(dialog).findByText(/customer_wallet/i)).toBeInTheDocument();
  });

  it('turns the journal button off without ledger:read, naming the permission', async () => {
    await renderAccount(1, ZAIN, { permissions: ['clients:read', 'wallet:read'], tab: 'statement' });
    const [journal] = await screen.findAllByRole('button', { name: /^View journal/ });
    expect(journal).toBeDisabled();
    expect(journal).toHaveAttribute('title', 'You need the ledger:read permission');
  });
});

describe('the states', () => {
  it('says no money moved yet when the wallet has no lines', async () => {
    mockServer.use(empty());
    await renderAccount(1, ZAIN, { tab: 'statement' });
    expect(await screen.findByText('No money moved yet')).toBeInTheDocument();
    expect(screen.getByText('Results: 0')).toBeInTheDocument();
  });

  it('says nothing moved between the days when a range finds nothing', async () => {
    const user = userEvent.setup();
    await renderAccount(1, ZAIN, { tab: 'statement' });
    await screen.findByText('Results: 1 - 50 of 141');
    mockServer.use(empty());
    const box = within(screen.getByRole('group', { name: 'Quick Search' }));
    await user.type(box.getByLabelText('From'), '2020-01-01');
    await user.type(box.getByLabelText('To'), '2020-01-02');
    await user.click(box.getByRole('button', { name: 'Search' }));
    expect(await screen.findByText('Nothing between these days')).toBeInTheDocument();
  });

  it('shows an error with Retry when the statement cannot be loaded', async () => {
    const user = userEvent.setup();
    mockServer.use(
      http.get('*/admin/clients/:id/statement', () =>
        HttpResponse.json({ title: 'Broken' }, { status: 400 }),
      ),
    );
    await renderAccount(1, ZAIN, { tab: 'statement' });
    expect(await screen.findByText('Could not load the statement')).toBeInTheDocument();
    mockServer.resetHandlers();
    await user.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByText('Results: 1 - 50 of 141')).toBeInTheDocument();
  });

  it('shows skeleton rows while the first page is read', async () => {
    let release = () => {};
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    mockServer.use(
      http.get('*/admin/clients/:id/statement', async () => {
        await gate;
        return undefined;
      }),
    );
    await renderAccount(1, ZAIN, { tab: 'statement' });
    expect(await screen.findByRole('status', { name: 'Loading' })).toBeInTheDocument();
    release();
    expect(await screen.findByText('Results: 1 - 50 of 141')).toBeInTheDocument();
  });
});
