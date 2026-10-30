// Tests for the four tabs of a merchant's page, run through the whole app against the dev mock API: Orders (the orders feature's
// table and drawer), Wallet ledger (balances, statement, journal, official statement), Pricing (client overrides with the server's
// floor check) and API access (the keys and Revoke). Each also shows what a role without the tab's permissions sees disabled.
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mockServer } from '@/mocks/node';
import { problem } from '@/mocks/problem';
import { setupMockApi } from '@/test/renderApp';
import { installMerchantMocks } from '../test/installMerchantMocks';
import { openMerchant, rowOf, sectionTabs, tableNamed } from '../test/openMerchants';

setupMockApi();
installMerchantMocks();
// The page is a lazy chunk: the first test of a run waits for its modules to load, which is slow while the whole suite
// runs in parallel. Every flow here also goes through the mock API with real dialogs, so give them room.
vi.setConfig({ testTimeout: 30_000 });
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

const ZAIN = /Zain Mobile Hub/;
type User = ReturnType<typeof userEvent.setup>;

describe('tabs', () => {
  it('shows the four tabs, opens on Orders, and keeps the chosen tab in the address', async () => {
    const user = userEvent.setup();
    const app = await openMerchant(1, ZAIN);
    expect(
      sectionTabs()
        .getAllByRole('tab')
        .map((tab) => tab.textContent),
    ).toEqual(['Orders', 'Wallet ledger', 'Pricing', 'API access']);
    expect(sectionTabs().getByRole('tab', { name: 'Orders' })).toHaveAttribute('aria-selected', 'true');
    await user.click(sectionTabs().getByRole('tab', { name: 'Wallet ledger' }));
    expect(app.location()).toBe('/merchants/1?tab=wallet');
    await user.click(sectionTabs().getByRole('tab', { name: 'Orders' }));
    expect(app.location()).toBe('/merchants/1');
  });

  it('opens the tab named in the address', async () => {
    await openMerchant(1, ZAIN, '?tab=pricing');
    expect(sectionTabs().getByRole('tab', { name: 'Pricing' })).toHaveAttribute('aria-selected', 'true');
    expect(await screen.findByText('Client overrides')).toBeInTheDocument();
  });
});

describe('Orders tab', () => {
  it('lists the merchant’s orders without a Buyer column, and opens an order’s drawer in the address', async () => {
    const user = userEvent.setup();
    const app = await openMerchant(1, ZAIN);
    const table = await tableNamed('Orders of Zain Mobile Hub');
    await waitFor(() => expect(table.getAllByRole('row').length).toBeGreaterThan(1));
    expect(table.queryByRole('columnheader', { name: /Buyer/ })).not.toBeInTheDocument();
    expect(table.getByRole('columnheader', { name: /Service/ })).toBeInTheDocument();
    await user.click(table.getAllByRole('button', { name: /^ORD-\d+$/ })[0]);
    expect(app.location()).toMatch(/^\/merchants\/1\?order=\d+$/);
    expect(await screen.findByRole('dialog', { name: /^(Order \d+|ORD-\d+)$/ })).toBeInTheDocument();
  });

  it('explains an empty list by what the merchant’s state allows', async () => {
    await openMerchant(18, /Algiers Service Plus/);
    expect(await screen.findByText('No orders from this merchant')).toBeInTheDocument();
    expect(screen.getByText('Orders appear after the account is approved and funded.')).toBeInTheDocument();
  });
});

describe('Wallet ledger tab', () => {
  const openWallet = (permissions?: string[]) =>
    openMerchant(1, ZAIN, '?tab=wallet', permissions ? { permissions } : {});

  it('shows the four balances and a statement with a running balance, 25 lines to a page', async () => {
    const user = userEvent.setup();
    await openWallet();
    const panel = within(await screen.findByRole('tabpanel', { name: 'Wallet ledger' }));
    // The statement's column headers repeat two of the labels; the strip comes first.
    const figure = (label: string) => panel.getAllByText(label)[0].nextElementSibling;
    await waitFor(() => expect(figure('Credit limit')).toHaveTextContent('$2,000.00'));
    expect(figure('Balance')).toHaveTextContent('$1,209.75');
    expect(figure('Reserved')).toHaveTextContent('$71.23');
    expect(figure('Available')).toHaveTextContent('$3,209.75');

    const table = await tableNamed('Wallet ledger');
    await waitFor(() => expect(table.getAllByRole('row')).toHaveLength(26));
    // Newest first: the top line ends at the balance of the wallet.
    expect(table.getAllByRole('row')[1]).toHaveTextContent('$1,209.75');
    expect(await screen.findByText('1–25 of 141')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Next page' }));
    expect(await screen.findByText('26–50 of 141')).toBeInTheDocument();
  });

  it('writes money in as +$ and money out as -$, with the type of each line', async () => {
    await openWallet();
    const table = await tableNamed('Wallet ledger');
    await waitFor(() => expect(table.getAllByRole('row')).toHaveLength(26));
    const rows = table.getAllByRole('row').slice(1);
    expect(rows.some((row) => within(row).queryByText(/^\+\$/))).toBe(true);
    expect(rows.some((row) => within(row).queryByText(/^-\$/))).toBe(true);
    expect(
      within(rows[0]).getByText(/^(Order settled|Hold released|Order hold|Deposit|Adjustment)$/),
    ).toBeInTheDocument();
  });

  it('sorts on the server when the When header is pressed', async () => {
    const user = userEvent.setup();
    await openWallet();
    const table = await tableNamed('Wallet ledger');
    await waitFor(() => expect(table.getAllByRole('row')).toHaveLength(26));
    const newest = table.getAllByRole('row')[1].textContent;
    await user.click(await screen.findByRole('button', { name: 'When' }));
    await waitFor(() => expect(table.getAllByRole('row')[1].textContent).not.toBe(newest));
    expect(screen.getByRole('columnheader', { name: /When/ })).toHaveAttribute('aria-sort', 'ascending');
  });

  it('opens the journal behind a line with its accounts, debits and credits', async () => {
    const user = userEvent.setup();
    await openWallet();
    const [first] = await screen.findAllByRole('button', { name: /^View journal JRN-\d{5}$/ });
    await user.click(first);
    const dialog = await screen.findByRole('dialog', { name: /^JRN-\d{5} · / });
    expect(await within(dialog).findByText('client_wallet')).toBeInTheDocument();
    expect(within(dialog).getByText('Debits equal credits in each journal.')).toBeInTheDocument();
    expect(within(dialog).getByRole('columnheader', { name: 'Debit' })).toBeInTheDocument();
    expect(within(dialog).getByText('Total')).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Close' }));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: /^JRN-/ })).not.toBeInTheDocument());
  });

  it('shows an adjustment as the newest line, with its journal', async () => {
    const user = userEvent.setup();
    await openWallet();
    await user.click(await screen.findByRole('button', { name: 'Adjust wallet…' }));
    const dialog = await screen.findByRole('dialog', { name: 'Adjust wallet' });
    await user.type(within(dialog).getByLabelText('Amount (USD)'), '25');
    await user.type(within(dialog).getByLabelText('Reason'), 'Refund for duplicate charge');
    await user.click(within(dialog).getByRole('button', { name: 'Post adjustment' }));
    await screen.findByText('Credited $25.00');
    const table = await tableNamed('Wallet ledger');
    await waitFor(() =>
      expect(table.getAllByRole('row')[1]).toHaveTextContent('Refund for duplicate charge'),
    );
    expect(table.getAllByRole('row')[1]).toHaveTextContent('+$25.00');
    expect(table.getAllByRole('row')[1]).toHaveTextContent('$1,234.75');
    await user.click(within(table.getAllByRole('row')[1]).getByRole('button', { name: /^View journal/ }));
    const journal = await screen.findByRole('dialog', { name: /Manual credit: Refund for duplicate charge/ });
    expect(await within(journal).findByText('adjustments')).toBeInTheDocument();
  });

  it('downloads the official statement and says which file it saved', async () => {
    const user = userEvent.setup();
    const created: Blob[] = [];
    vi.stubGlobal(
      'URL',
      Object.assign(URL, {
        createObjectURL: (blob: Blob) => (created.push(blob), 'blob:test'),
        revokeObjectURL: vi.fn(),
      }),
    );
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    await openWallet();
    await user.click(await screen.findByRole('button', { name: 'Download official statement' }));
    expect(await screen.findByText('Statement downloaded')).toBeInTheDocument();
    expect(screen.getByText('statement-1-mock.pdf for Zain Mobile Hub.')).toBeInTheDocument();
    expect(created).toHaveLength(1);
  });

  it('shows the server’s refusal of the statement in a toast', async () => {
    const user = userEvent.setup();
    mockServer.use(
      http.get('*/admin/reports/client-statement/:clientId', () =>
        problem(403, 'FORBIDDEN', 'Not allowed', 'Your role cannot export statements.'),
      ),
    );
    await openWallet();
    await user.click(await screen.findByRole('button', { name: 'Download official statement' }));
    expect(await screen.findByText('Not allowed')).toBeInTheDocument();
    expect(screen.getByText(/Your role cannot export statements\./)).toBeInTheDocument();
  });

  it('shows an error with Retry when the statement cannot be loaded', async () => {
    const user = userEvent.setup();
    mockServer.use(
      http.get('*/admin/clients/:id/statement', () =>
        HttpResponse.json({ title: 'Broken' }, { status: 400 }),
      ),
    );
    await openWallet();
    expect(await screen.findByText('Could not load the statement')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByText('Could not load the statement')).toBeInTheDocument();
  });

  it('disables the download and the journals for a role without reports:read and ledger:read', async () => {
    await openWallet(['clients:read', 'wallet:read']);
    const download = await screen.findByRole('button', { name: 'Download official statement' });
    expect(download).toBeDisabled();
    expect(download).toHaveAttribute('title', 'You need the reports:read permission');
    const [journal] = await screen.findAllByRole('button', { name: /^View journal/ });
    expect(journal).toBeDisabled();
    expect(journal).toHaveAttribute('title', 'You need the ledger:read permission');
  });
});

describe('Pricing tab', () => {
  const openPricing = (permissions?: string[]) =>
    openMerchant(1, ZAIN, '?tab=pricing', permissions ? { permissions } : {});

  async function openAdd(user: User) {
    await user.click(await screen.findByRole('button', { name: 'Add override' }));
    return screen.findByRole('dialog', { name: 'Add client override' });
  }

  it('shows the price group and the overrides with the base price, the group price and the floor', async () => {
    await openPricing();
    const pricing = screen.getByRole('tabpanel', { name: 'Pricing' });
    expect(within(pricing).getByText('VIP')).toBeInTheDocument();
    expect(within(pricing).getByText('· 8% off base price')).toBeInTheDocument();
    const row = await rowOf('Client overrides', 'iCloud Clean / Lost Check');
    expect(row.getByText('IMEI')).toBeInTheDocument();
    expect(row.getByText('$0.13')).toBeInTheDocument();
    expect(row.getByText('$0.12')).toBeInTheDocument();
    expect(row.getByText('$0.10', { selector: 'span.font-medium' })).toBeInTheDocument();
  });

  it('says what the merchant pays when there are no overrides', async () => {
    await openMerchant(2, /Al-Noor Telecom/, '?tab=pricing');
    expect(
      await screen.findByText('No overrides. This merchant pays the Wholesale group price on every service.'),
    ).toBeInTheDocument();
  });

  it('adds an override: the server’s floor shows under the price, then a valid price is saved', async () => {
    const user = userEvent.setup();
    await openPricing();
    const dialog = await openAdd(user);
    const service = within(dialog).getByLabelText('Service');
    await waitFor(() => expect(within(service).getAllByRole('option').length).toBeGreaterThan(5));
    const options = within(service)
      .getAllByRole('option')
      .map((option) => option.textContent);
    expect(options).toContain('AT&T USA Premier Unlock (floor $14.31)');
    // A service that already has an override is not offered again.
    expect(options.some((text) => text?.startsWith('iCloud Clean / Lost Check'))).toBe(false);

    await user.click(within(dialog).getByRole('button', { name: 'Save override' }));
    expect(await within(dialog).findByText('Choose a service.')).toBeInTheDocument();
    expect(within(dialog).getByText('Enter a price greater than zero.')).toBeInTheDocument();

    // By the service's id: user-event matches an option's text as HTML, where the & of AT&T is escaped.
    await user.selectOptions(service, '5');
    expect(
      within(dialog).getByText('Must be at or above $14.31, the floor (cost plus minimum profit).'),
    ).toBeInTheDocument();
    await user.type(within(dialog).getByLabelText('Price (USD)'), '10');
    await user.click(within(dialog).getByRole('button', { name: 'Save override' }));
    expect(
      await within(dialog).findByText('Below the floor of $14.31 (cost $13.50 plus $0.81 minimum profit).'),
    ).toBeInTheDocument();
    expect(within(dialog).getByLabelText('Price (USD)')).toHaveAttribute('aria-invalid', 'true');

    await user.clear(within(dialog).getByLabelText('Price (USD)'));
    await user.type(within(dialog).getByLabelText('Price (USD)'), '15');
    await user.type(within(dialog).getByLabelText('Note (optional)'), 'Volume deal');
    await user.click(within(dialog).getByRole('button', { name: 'Save override' }));
    expect(await screen.findByText('Override saved')).toBeInTheDocument();
    expect(
      screen.getByText('AT&T USA Premier Unlock is now $15.00 for Zain Mobile Hub.'),
    ).toBeInTheDocument();
    const row = await rowOf('Client overrides', 'AT&T USA Premier Unlock');
    expect(row.getByText('$15.00')).toBeInTheDocument();
    expect(row.getByText('$17.28')).toBeInTheDocument();
    expect(row.getByText('$15.90')).toBeInTheDocument();
  });

  it('edits an override and sends only what changed; says nothing changed when it did not', async () => {
    const user = userEvent.setup();
    await openPricing();
    await user.click(
      await screen.findByRole('button', { name: 'Edit override for iCloud Clean / Lost Check' }),
    );
    const dialog = await screen.findByRole('dialog', { name: 'Edit client override' });
    expect(within(dialog).getByLabelText('Price (USD)')).toHaveValue('0.10');
    expect(within(dialog).getByText('iCloud Clean / Lost Check')).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Save override' }));
    expect(await screen.findByText('Nothing changed')).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: 'Edit client override' })).not.toBeInTheDocument(),
    );

    let body: unknown;
    mockServer.use(
      http.patch('*/admin/client-prices/:id', async ({ request }) => {
        body = await request.json();
        return problem(422, 'VALIDATION_FAILED', 'Check the form', 'Some fields need attention.', [
          { field: 'price', message: 'Below the floor.' },
        ]);
      }),
    );
    await user.click(screen.getByRole('button', { name: 'Edit override for iCloud Clean / Lost Check' }));
    const again = await screen.findByRole('dialog', { name: 'Edit client override' });
    await user.clear(within(again).getByLabelText('Price (USD)'));
    await user.type(within(again).getByLabelText('Price (USD)'), '0.05');
    await user.click(within(again).getByRole('button', { name: 'Save override' }));
    expect(await within(again).findByText('Below the floor.')).toBeInTheDocument();
    expect(body).toEqual({ price: '0.0500' });
  });

  it('saves a new price for an override', async () => {
    const user = userEvent.setup();
    await openPricing();
    await user.click(
      await screen.findByRole('button', { name: 'Edit override for iCloud Clean / Lost Check' }),
    );
    const dialog = await screen.findByRole('dialog', { name: 'Edit client override' });
    await user.clear(within(dialog).getByLabelText('Price (USD)'));
    await user.type(within(dialog).getByLabelText('Price (USD)'), '0.12');
    await user.click(within(dialog).getByRole('button', { name: 'Save override' }));
    expect(
      await screen.findByText('iCloud Clean / Lost Check is now $0.12 for Zain Mobile Hub.'),
    ).toBeInTheDocument();
    expect(
      (await rowOf('Client overrides', 'iCloud Clean / Lost Check')).getByText('$0.12', {
        selector: 'span.font-medium',
      }),
    ).toBeInTheDocument();
  });

  it('removes an override after a review step', async () => {
    const user = userEvent.setup();
    await openPricing();
    await user.click(
      await screen.findByRole('button', { name: 'Remove override for iCloud Clean / Lost Check' }),
    );
    const dialog = await screen.findByRole('dialog', {
      name: 'Remove the override for iCloud Clean / Lost Check?',
    });
    expect(within(dialog).getByText(/instead of \$0\.10/)).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Remove override' }));
    expect(await screen.findByText('Override removed')).toBeInTheDocument();
    expect(
      await screen.findByText('No overrides. This merchant pays the VIP group price on every service.'),
    ).toBeInTheDocument();
  });

  it('says why the service menu is empty for a role that cannot list the services', async () => {
    const user = userEvent.setup();
    await openPricing(['clients:read', 'pricing:read', 'pricing:create']);
    const dialog = await openAdd(user);
    expect(
      within(dialog).getByText('Listing the services needs the catalog:read permission.'),
    ).toBeInTheDocument();
    expect(within(dialog).getByLabelText('Service')).toBeDisabled();
  });

  it('disables Add, Edit and Remove for a role that can only read prices', async () => {
    await openPricing(['clients:read', 'pricing:read']);
    const add = await screen.findByRole('button', { name: 'Add override' });
    expect(add).toBeDisabled();
    expect(add).toHaveAttribute('title', 'You need the pricing:create permission');
    expect(
      screen.getByRole('button', { name: 'Edit override for iCloud Clean / Lost Check' }),
    ).toHaveAttribute('title', 'You need the pricing:update permission');
    expect(
      screen.getByRole('button', { name: 'Remove override for iCloud Clean / Lost Check' }),
    ).toHaveAttribute('title', 'You need the pricing:delete permission');
  });
});

describe('API access tab', () => {
  const openApi = (permissions?: string[], id = 1, name: string | RegExp = ZAIN) =>
    openMerchant(id, name, '?tab=api', permissions ? { permissions } : {});

  it('shows the Dhru endpoint with a copy button, the username, and the keys with their state', async () => {
    await openApi();
    const panel = screen.getByRole('tabpanel', { name: 'API access' });
    expect(within(panel).getByText('http://api.test/api/index.php')).toBeInTheDocument();
    expect(within(panel).getByRole('button', { name: 'Copy endpoint' })).toBeInTheDocument();
    expect(within(panel).getByText('zain-mobile-hub')).toBeInTheDocument();
    const production = await rowOf('API keys', 'Production');
    expect(production.getByText('gsm_live_69xx…')).toBeInTheDocument();
    expect(production.getByText('203.0.113.55', { selector: '.chip' })).toBeInTheDocument();
    expect(production.getByText('Active')).toBeInTheDocument();
    const staging = await rowOf('API keys', 'Staging');
    expect(staging.getByText('Any IP')).toBeInTheDocument();
    expect(staging.getByText('Never')).toBeInTheDocument();
    const legacy = await rowOf('API keys', 'Legacy integration');
    expect(legacy.getByText('Revoked')).toBeInTheDocument();
    expect(legacy.queryByRole('button', { name: /Revoke/ })).not.toBeInTheDocument();
    expect(
      within(panel).getByText(
        'Merchants can keep their existing Dhru Fusion client. Only the URL and key change.',
      ),
    ).toBeInTheDocument();
    // The demo's "Rotate key" has no admin route, so there is no such button.
    expect(screen.queryByRole('button', { name: /Rotate/ })).not.toBeInTheDocument();
  });

  it('revokes a key after a review step that says what stops working', async () => {
    const user = userEvent.setup();
    await openApi();
    await user.click(await screen.findByRole('button', { name: 'Revoke Production' }));
    const dialog = await screen.findByRole('dialog', { name: 'Revoke API key' });
    expect(within(dialog).getByText(/stops working immediately/)).toBeInTheDocument();
    expect(
      within(dialog).getByText(/Zain Mobile Hub must create a new key in their portal/),
    ).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Revoke key' }));
    expect(await screen.findByText('API key revoked')).toBeInTheDocument();
    expect(screen.getByText('Production (gsm_live_69xx…) no longer works.')).toBeInTheDocument();
    await waitFor(async () =>
      expect((await rowOf('API keys', 'Production')).getByText('Revoked')).toBeInTheDocument(),
    );
    expect(
      (await rowOf('API keys', 'Production')).queryByRole('button', { name: /Revoke/ }),
    ).not.toBeInTheDocument();
  });

  it('shows the server’s refusal in the dialog and keeps the key', async () => {
    const user = userEvent.setup();
    mockServer.use(
      http.delete('*/admin/api-keys/:id', () =>
        problem(409, 'KEY_IN_USE', 'Key in use', 'The key is in use by 3 open orders.'),
      ),
    );
    await openApi();
    await user.click(await screen.findByRole('button', { name: 'Revoke Staging' }));
    const dialog = await screen.findByRole('dialog', { name: 'Revoke API key' });
    await user.click(within(dialog).getByRole('button', { name: 'Revoke key' }));
    expect(await within(dialog).findByText('The key is in use by 3 open orders.')).toBeInTheDocument();
    expect((await rowOf('API keys', 'Staging')).getByText('Active')).toBeInTheDocument();
  });

  it('says a merchant waiting for approval has no keys yet', async () => {
    await openApi(undefined, 18, /Algiers Service Plus/);
    expect(await screen.findByText('No API keys yet')).toBeInTheDocument();
    expect(
      screen.getByText('The merchant can create a key in their portal once you approve the account.'),
    ).toBeInTheDocument();
  });

  it('disables Revoke for a role without api_keys:revoke', async () => {
    await openApi(['clients:read', 'api_keys:read']);
    const revoke = await screen.findByRole('button', { name: 'Revoke Production' });
    expect(revoke).toBeDisabled();
    expect(revoke).toHaveAttribute('title', 'You need the api_keys:revoke permission');
  });
});
