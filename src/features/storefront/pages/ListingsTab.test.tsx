// Tests for the Services on sale tab: the figures and columns, the On the site switch, the price dialog with the server's floor
// refusal, and the search kept in the address. The Add listing dialog has its own file (AddListing.test.tsx).
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http } from 'msw';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mockServer } from '@/mocks/node';
import { problem } from '@/mocks/problem';
import { setupMockApi } from '@/test/renderApp';
import { deleteRetailPriceRule } from '../api';
import { recordRequests } from '../test/requests';
import { storefrontStore } from '../mocks/store';
import { dialogOf, openStorefront, rowOf, tabTexts, tableNamed } from '../test/storefrontPage';

setupMockApi();
vi.setConfig({ testTimeout: 20_000 });
// `recordRequests` spies on fetch: put it back after each test so one test's requests are not read by the next.
afterEach(() => vi.restoreAllMocks());

const TABLE = 'Storefront listings';

describe('the table and the figures', () => {
  it('opens on Services on sale with the count of listings on the site, and the demo’s heading and copy', async () => {
    await openStorefront();
    expect(screen.getByText(/^The public site where consumers buy one unlock at a time/)).toBeInTheDocument();
    expect(await screen.findByRole('tab', { name: /^Services on sale/ })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    await waitFor(() => expect(tabTexts()[0]).toBe('Services on sale11'));
    expect(screen.getByRole('heading', { level: 2, name: 'What the public can buy' })).toBeInTheDocument();
  });

  it('counts the listings on the site, off it and locked from the server’s totals', async () => {
    await openStorefront();
    const strip = within(await screen.findByRole('region', { name: 'Storefront catalogue' }));
    await waitFor(() =>
      expect(strip.getByText('Services on the site').parentElement).toHaveTextContent('11'),
    );
    expect(strip.getByText('Locked to B2B').parentElement).toHaveTextContent('3');
    expect(strip.getByText('Not on the site').parentElement).toHaveTextContent('0');
  });

  it('shows each listing with its code and slug, B2B base, storefront price, floor, margin and no language', async () => {
    await openStorefront();
    const row = await rowOf(TABLE, 'AT&T USA Premier Unlock');
    expect(row.getByText('IMEI-ATT-USA · /atandt-usa-premier-unlock')).toBeInTheDocument();
    expect(row.getByText('$17.28')).toBeInTheDocument();
    expect(row.getByText('$25.99')).toBeInTheDocument();
    expect(row.getByText('Floor $19.01')).toBeInTheDocument();
    expect(row.getByText('48.1%')).toBeInTheDocument();
    expect(screen.queryByRole('columnheader', { name: 'Language' })).not.toBeInTheDocument();
    expect(row.getByRole('switch', { name: 'Show AT&T USA Premier Unlock on the storefront' })).toBeChecked();
  });

  it('shows a locked service with its reason and neither a switch nor a price button', async () => {
    await openStorefront();
    const row = await rowOf(TABLE, 'MDM Removal, iPhone Premium');
    expect(row.getByText(/^High risk: removal services attract stolen devices/)).toBeInTheDocument();
    expect(row.queryByRole('switch')).not.toBeInTheDocument();
    expect(row.queryByRole('button')).not.toBeInTheDocument();
  });
});

describe('the On the site switch', () => {
  it('takes a service off the storefront and says so', async () => {
    const user = userEvent.setup();
    await openStorefront();
    const row = await rowOf(TABLE, 'EE UK Unlock');
    await user.click(row.getByRole('switch', { name: 'Show EE UK Unlock on the storefront' }));
    expect(await screen.findByText('Removed from the storefront')).toBeInTheDocument();
    await waitFor(async () =>
      expect((await rowOf(TABLE, 'EE UK Unlock')).getByRole('switch')).not.toBeChecked(),
    );
    await waitFor(() => expect(tabTexts()[0]).toBe('Services on sale10'));
  });
});

describe('the price dialog', () => {
  async function openPrice(user: ReturnType<typeof userEvent.setup>, name: string) {
    await openStorefront();
    const row = await rowOf(TABLE, name);
    await user.click(row.getByRole('button', { name: `Edit the storefront price of ${name}` }));
    return dialogOf('Storefront price');
  }

  it('shows the floor the server works out and saves a higher price', async () => {
    const user = userEvent.setup();
    const dialog = await openPrice(user, 'AT&T USA Premier Unlock');
    expect(dialog.getByText(/^Floor \$19\.01: the lowest price the server accepts/)).toBeInTheDocument();
    expect(dialog.getByText('B2B base price').nextSibling).toHaveTextContent('$17.28');
    const price = dialog.getByRole('textbox', { name: /^Price shown to customers/ });
    expect(price).toHaveValue('25.99');
    await user.clear(price);
    await user.type(price, '30');
    await user.click(dialog.getByRole('button', { name: 'Save price' }));
    expect(await screen.findByText('Price saved')).toBeInTheDocument();
    expect(screen.getByText('AT&T USA Premier Unlock is now $30.00 on the storefront.')).toBeInTheDocument();
    expect(await (await rowOf(TABLE, 'AT&T USA Premier Unlock')).findByText('$30.00')).toBeInTheDocument();
    expect(screen.queryByRole('dialog', { name: 'Storefront price' })).not.toBeInTheDocument();
  });

  it('shows the server’s refusal of a price under the floor under the field and keeps the dialog open', async () => {
    const user = userEvent.setup();
    const dialog = await openPrice(user, 'AT&T USA Premier Unlock');
    const price = dialog.getByRole('textbox', { name: /^Price shown to customers/ });
    await user.clear(price);
    await user.type(price, '18');
    await user.click(dialog.getByRole('button', { name: 'Save price' }));
    expect(
      await dialog.findByText(
        /^Below the floor\. The storefront must stay above the B2B base price \(\$17\.28 plus 10%\)/,
      ),
    ).toBeInTheDocument();
    expect(price).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByRole('dialog', { name: 'Storefront price' })).toBeInTheDocument();
    expect(screen.queryByText('Price saved')).not.toBeInTheDocument();
  });

  it('asks for a price before sending anything and says nothing changed for the same price', async () => {
    const user = userEvent.setup();
    const dialog = await openPrice(user, 'EE UK Unlock');
    const price = dialog.getByRole('textbox', { name: /^Price shown to customers/ });
    await user.clear(price);
    await user.click(dialog.getByRole('button', { name: 'Save price' }));
    expect(await dialog.findByText('Enter a price greater than zero.')).toBeInTheDocument();
    await user.type(price, '12.99');
    await user.click(dialog.getByRole('button', { name: 'Save price' }));
    expect(await screen.findByText('Nothing changed')).toBeInTheDocument();
  });
});

describe('who wrote the price', () => {
  it('marks a price a rule wrote with a Rule tag that says which rule, and a price that waits with Waiting', async () => {
    await openStorefront();
    const imei = await rowOf(TABLE, 'iCloud Clean / Lost Check');
    expect(imei.getByText('Rule')).toBeInTheDocument();
    expect(imei.getByTitle('IMEI +30%')).toBeInTheDocument();
    expect(imei.queryByText('Waiting')).not.toBeInTheDocument();
    const carrier = await rowOf(TABLE, 'T-Mobile USA Unlock');
    expect(carrier.getByText('Rule')).toBeInTheDocument();
    expect(carrier.getByTitle('Carrier unlock +20% +$0.50, up to 5 cents')).toBeInTheDocument();
    expect(carrier.getByText('Waiting')).toBeInTheDocument();
  });

  it('shows no mark for a typed price', async () => {
    await openStorefront();
    const typed = await rowOf(TABLE, 'AT&T USA Premier Unlock');
    expect(typed.queryByText('Rule')).not.toBeInTheDocument();
    expect(typed.queryByText('Waiting')).not.toBeInTheDocument();
  });
});

describe('the price dialog and the pricing rule', () => {
  type User = ReturnType<typeof userEvent.setup>;
  async function openPrice(user: User, name: string) {
    await openStorefront();
    const row = await rowOf(TABLE, name);
    await user.click(row.getByRole('button', { name: `Edit the storefront price of ${name}` }));
    return dialogOf('Storefront price');
  }

  it('offers the rule and a typed price, and starts on the way the price is set now', async () => {
    const user = userEvent.setup();
    const typed = await openPrice(user, 'AT&T USA Premier Unlock');
    expect(typed.getByRole('radio', { name: /^Type a price/ })).toBeChecked();
    expect(typed.getByRole('textbox', { name: /^Price shown to customers/ })).toBeInTheDocument();
  });

  it('starts on the rule for a price a rule wrote, names the rule and says a change waits, and hides the price field', async () => {
    const user = userEvent.setup();
    const dialog = await openPrice(user, 'T-Mobile USA Unlock');
    expect(dialog.getByRole('radio', { name: /^Follow the pricing rule/ })).toBeChecked();
    expect(
      dialog.getByText(/Priced now by: Carrier unlock \+20% \+\$0\.50, up to 5 cents\./),
    ).toBeInTheDocument();
    expect(
      dialog.getByText(/A price change waits for your approval on the Retail pricing tab\./),
    ).toBeInTheDocument();
    expect(dialog.queryByRole('textbox', { name: /^Price shown to customers/ })).not.toBeInTheDocument();
  });

  it('sends retailPricing rule alone, and the table then shows the server’s price with a Rule tag', async () => {
    const user = userEvent.setup();
    const dialog = await openPrice(user, 'Samsung KG Lock Fix');
    const requests = recordRequests();
    await user.click(dialog.getByRole('radio', { name: /^Follow the pricing rule/ }));
    expect(dialog.queryByRole('textbox', { name: /^Price shown to customers/ })).not.toBeInTheDocument();
    await user.click(dialog.getByRole('button', { name: 'Save price' }));
    expect(await screen.findByText('Price follows the rule')).toBeInTheDocument();
    expect(screen.getByText('Samsung KG Lock Fix is now $15.50 on the storefront.')).toBeInTheDocument();
    const patch = requests.sent().find((sent) => sent.method === 'PATCH')!;
    expect(patch.body).toEqual({ retailPricing: 'rule' });
    const row = await rowOf(TABLE, 'Samsung KG Lock Fix');
    expect(await row.findByText('$15.50')).toBeInTheDocument();
    expect(row.getByText('Rule')).toBeInTheDocument();
  });

  it('shows the server’s refusal when no rule covers the service, under the choice, and keeps the dialog open', async () => {
    const user = userEvent.setup();
    const dialog = await openPrice(user, 'Samsung KG Lock Fix');
    for (const id of [1, 2, 3, 4]) await deleteRetailPriceRule(id);
    await user.click(dialog.getByRole('radio', { name: /^Follow the pricing rule/ }));
    await user.click(dialog.getByRole('button', { name: 'Save price' }));
    expect(await dialog.findByText('No pricing rule covers this service.')).toBeInTheDocument();
    expect(dialog.getByRole('radio', { name: /^Follow the pricing rule/ })).toHaveAttribute(
      'aria-invalid',
      'true',
    );
    expect(screen.getByRole('dialog', { name: 'Storefront price' })).toBeInTheDocument();
    expect(screen.queryByText('Price follows the rule')).not.toBeInTheDocument();
  });

  it('shows the server’s refusal when the service has no cost', async () => {
    const user = userEvent.setup();
    const dialog = await openPrice(user, 'Samsung KG Lock Fix');
    // Samsung KG Lock Fix is service 13 of the mock.
    (await storefrontStore()).services.get(13)!.cost = 0;
    await user.click(dialog.getByRole('radio', { name: /^Follow the pricing rule/ }));
    await user.click(dialog.getByRole('button', { name: 'Save price' }));
    expect(
      await dialog.findByText('This service has no cost, so a rule cannot price it.'),
    ).toBeInTheDocument();
  });

  it('turns following off when a price is typed: the typed price goes out and the Rule tag goes', async () => {
    const user = userEvent.setup();
    const dialog = await openPrice(user, 'T-Mobile USA Unlock');
    const requests = recordRequests();
    await user.click(dialog.getByRole('radio', { name: /^Type a price/ }));
    const price = dialog.getByRole('textbox', { name: /^Price shown to customers/ });
    expect(price).toHaveValue('19.99');
    await user.clear(price);
    await user.type(price, '21.99');
    await user.click(dialog.getByRole('button', { name: 'Save price' }));
    expect(await screen.findByText('Price saved')).toBeInTheDocument();
    expect(requests.sent().find((sent) => sent.method === 'PATCH')!.body).toEqual({ retailPrice: '21.9900' });
    const row = await rowOf(TABLE, 'T-Mobile USA Unlock');
    await waitFor(() => expect(row.queryByText('Rule')).not.toBeInTheDocument());
  });

  it('sends the same price as a typed one when the price followed a rule: that is how it stops following', async () => {
    const user = userEvent.setup();
    const dialog = await openPrice(user, 'T-Mobile USA Unlock');
    const requests = recordRequests();
    await user.click(dialog.getByRole('radio', { name: /^Type a price/ }));
    await user.click(dialog.getByRole('button', { name: 'Save price' }));
    expect(await screen.findByText('Price saved')).toBeInTheDocument();
    expect(requests.sent().find((sent) => sent.method === 'PATCH')!.body).toEqual({ retailPrice: '19.9900' });
  });
});

describe('search and sort in the address', () => {
  it('sends the search after a pause, keeps it in the address and clears it', async () => {
    const user = userEvent.setup();
    const app = await openStorefront();
    await user.type(await screen.findByRole('searchbox', { name: 'Search service, code, slug' }), 'vodafone');
    expect(await screen.findByText('1 listing')).toBeInTheDocument();
    expect(app.location()).toBe('/storefront?q=vodafone');
    expect(await rowOf(TABLE, 'Vodafone UK iPhone Unlock')).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Clear filters' }));
    expect(await screen.findByText('14 listings')).toBeInTheDocument();
    expect(app.location()).toBe('/storefront');
  });

  it('says no listing matches and offers to clear the search', async () => {
    const user = userEvent.setup();
    await openStorefront('/storefront?q=nothing-like-this');
    expect(await screen.findByText('No listings match')).toBeInTheDocument();
    // The toolbar and the empty state both offer it.
    await user.click(screen.getAllByRole('button', { name: 'Clear filters' })[0]);
    expect(await tableNamed(TABLE)).toBeTruthy();
  });

  it('sorts by the service title from the header and writes it in the address', async () => {
    const user = userEvent.setup();
    const app = await openStorefront();
    await tableNamed(TABLE);
    await user.click(screen.getByRole('button', { name: /^Service/ }));
    await waitFor(() => expect(app.location()).toBe('/storefront?sort=publicTitle&dir=desc'));
  });
});

describe('states of the table', () => {
  it('shows the server’s error with Retry, and loads the rows when the server answers again', async () => {
    mockServer.use(
      http.get('*/admin/service-listings', () => problem(403, 'FORBIDDEN', 'No access', 'Closed for now.')),
    );
    const user = userEvent.setup();
    await openStorefront();
    expect(await screen.findByText('Could not load the listings')).toBeInTheDocument();
    expect(screen.getByText('Closed for now.')).toBeInTheDocument();
    // The listings come back; Retry asks again.
    mockServer.resetHandlers();
    await user.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await rowOf(TABLE, 'EE UK Unlock')).toBeTruthy();
  });

  it('goes back to the last page when the address names one past the end', async () => {
    const app = await openStorefront('/storefront?page=9');
    expect(await rowOf(TABLE, 'EE UK Unlock')).toBeTruthy();
    expect(app.location()).toBe('/storefront');
  });
});
