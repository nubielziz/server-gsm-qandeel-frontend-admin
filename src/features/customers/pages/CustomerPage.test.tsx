// Tests for one customer's page, run through the whole app against the dev mock API: the not-found and error states, the header,
// the figures, and the five tabs kept in the address (Orders with the order drawer, Account for a guest and for an account,
// Support, Consents and data, Risk). The dialogs have their own file (CustomerDialogs.test.tsx).
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import { mockServer } from '@/mocks/node';
import { problem } from '@/mocks/problem';
import { setupMockApi } from '@/test/renderApp';
import { detailTabs, openCustomer } from '../test/customersPage';
import { customerDetail } from '../test/fixtures';

setupMockApi();
// The page is a lazy chunk and the first test of a run waits for its modules, which is slow while the whole suite runs in parallel.
vi.setConfig({ testTimeout: 20_000 });

const DANIEL = /Daniel Whitmore/; // c1: an account, 4 orders, one session, one refund, one dispute
const TYLER = /Tyler Brooks/; // c10: a guest, medium risk, 9 orders, one ticket
const JACK = /Jack Turner/; // c19: a guest, blocked, high risk, one order with two risk signals

const tab = (name: RegExp) => detailTabs().getByRole('tab', { name });

describe('the page', () => {
  it('says so when no customer has that id, with a way back', async () => {
    await openCustomer(9999, 'Customer not found');
    expect(screen.getByText('No customer with that ID')).toBeInTheDocument();
    expect(screen.getByText('It may have been removed.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to customers' })).toHaveAttribute('href', '/customers');
  });

  it('treats an address that is not a number the same way', async () => {
    await openCustomer('abc', 'Customer not found');
    expect(screen.getByText('No customer with that ID')).toBeInTheDocument();
  });

  it('shows the server’s error with a Retry button when the customer cannot load', async () => {
    const user = userEvent.setup();
    mockServer.use(
      http.get('*/admin/customers/:id', () =>
        problem(503, 'UNAVAILABLE', 'Service unavailable', 'Try again soon.'),
      ),
    );
    await openCustomer(1, 'Customer');
    // A 5xx answer is read again once, after a pause, before the error shows.
    expect(
      await screen.findByText('Could not load the customer', {}, { timeout: 5_000 }),
    ).toBeInTheDocument();
    mockServer.resetHandlers();
    await user.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByRole('heading', { level: 1, name: DANIEL })).toBeInTheDocument();
  });

  it('shows the name with the status and risk badges, the sub-line, and the name in the breadcrumb', async () => {
    await openCustomer(10, TYLER);
    const title = screen.getByRole('heading', { level: 1, name: TYLER });
    expect(within(title).getByText('Active')).toBeInTheDocument();
    expect(within(title).getByText('Medium risk')).toBeInTheDocument();
    expect(
      screen.getByText(
        /^tyler\.brooks@inbox\.example · United States · customer since \d{2} [A-Z][a-z]{2,3}$/,
      ),
    ).toBeInTheDocument();
    const crumb = screen.getByRole('navigation', { name: 'Breadcrumb' });
    expect(within(crumb).getByRole('link', { name: 'Customers' })).toHaveAttribute('href', '/customers');
    expect(within(crumb).getByText('Tyler Brooks')).toBeInTheDocument();
    await waitFor(() => expect(document.title).toContain('Tyler Brooks'));
  });

  it('shows a risk or status it does not know as it is, in a neutral badge, instead of failing', async () => {
    mockServer.use(
      http.get('*/admin/customers/:id', () =>
        HttpResponse.json(customerDetail({ riskLevel: 'med' as never, status: 'pending_review' as never })),
      ),
    );
    await openCustomer(1, DANIEL, { tab: 'risk' });
    const title = screen.getByRole('heading', { level: 1, name: DANIEL });
    expect(within(title).getByText('pending_review').closest('.badge')).toHaveClass('b-neutral');
    expect(within(title).getByText('med risk').closest('.badge')).toHaveClass('b-neutral');
    expect(await screen.findByText('Risk level')).toBeInTheDocument();
    expect(within(screen.getByRole('tabpanel')).getAllByText('pending_review')).toHaveLength(1);
  });

  it('shows no risk badge for a low risk', async () => {
    await openCustomer(1, DANIEL);
    const title = screen.getByRole('heading', { level: 1, name: DANIEL });
    expect(within(title).getByText('Active')).toBeInTheDocument();
    expect(within(title).queryByText(/risk$/)).not.toBeInTheDocument();
  });

  it('shows the five figures', async () => {
    await openCustomer(10, TYLER);
    const figures = within(await screen.findByRole('region', { name: 'Customer figures' }));
    expect(figures.getByText('9')).toBeInTheDocument();
    expect(figures.getByText(/^Last /)).toBeInTheDocument();
    expect(figures.getByText('$108.92')).toBeInTheDocument();
    expect(figures.getByText('Average $12.10')).toBeInTheDocument();
    expect(figures.getByText('11% of orders')).toBeInTheDocument();
    expect(figures.getByText('Support tickets')).toBeInTheDocument();
    // One refund, one ticket and one dispute; the disputes figure is in the critical colour.
    expect(figures.getAllByText('1')).toHaveLength(3);
    expect(figures.getByText('Disputes').nextElementSibling).toHaveClass('text-crit-fg');
  });

  it('shows counts on the Orders and Support tabs and keeps the open tab in the address', async () => {
    const user = userEvent.setup();
    const app = await openCustomer(1, DANIEL);
    expect(
      detailTabs()
        .getAllByRole('tab')
        .map((item) => item.textContent),
    ).toEqual(['Orders4', 'Account', 'Support0', 'Consents and data', 'Risk']);
    expect(tab(/^Orders/)).toHaveAttribute('aria-selected', 'true');
    await user.click(tab(/^Account/));
    expect(app.location()).toBe('/customers/1?tab=account');
    await user.click(tab(/^Orders/));
    expect(app.location()).toBe('/customers/1');
  });

  it('opens the tab named in the address', async () => {
    await openCustomer(1, DANIEL, { tab: 'risk' });
    expect(tab(/^Risk/)).toHaveAttribute('aria-selected', 'true');
    expect(await screen.findByText('Signals seen on their orders')).toBeInTheDocument();
    expect(screen.getByRole('tabpanel', { name: 'Risk' })).toBeInTheDocument();
  });

  it('opens the Orders tab for a tab name it does not know', async () => {
    await openCustomer(1, DANIEL, { tab: 'billing' });
    expect(tab(/^Orders/)).toHaveAttribute('aria-selected', 'true');
    expect(await screen.findByRole('table', { name: 'Orders by this customer' })).toBeInTheDocument();
  });
});

describe('Orders tab', () => {
  it('lists the customer’s orders without a Buyer column, and opens an order’s drawer in the address', async () => {
    const user = userEvent.setup();
    const app = await openCustomer(1, DANIEL);
    const table = within(await screen.findByRole('table', { name: 'Orders by this customer' }));
    expect(await table.findByText('SF-20485')).toBeInTheDocument();
    expect(table.getByText('SF-20466')).toBeInTheDocument();
    expect(table.queryByRole('columnheader', { name: 'Buyer' })).not.toBeInTheDocument();
    expect(table.getAllByRole('row')).toHaveLength(5);

    await user.click(table.getByText('SF-20485'));
    expect(app.location()).toBe('/customers/1?order=20485');
    expect(await screen.findByRole('dialog', { name: 'SF-20485' })).toBeInTheDocument();
  });

  it('says so for a customer who has not bought anything', async () => {
    await openCustomer(16, /Mia Schneider/);
    expect(await screen.findByText('No orders')).toBeInTheDocument();
    expect(screen.getByText('This customer has not bought anything yet.')).toBeInTheDocument();
  });

  it('does not ask for orders without orders:read, and says why', async () => {
    await openCustomer(1, DANIEL, { permissions: ['customers:read'] });
    expect(await screen.findByText('Orders are hidden for your role')).toBeInTheDocument();
    expect(
      screen.getByText('You need the orders:read permission to see what this customer bought.'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('table', { name: 'Orders by this customer' })).not.toBeInTheDocument();
  });
});

describe('Account tab', () => {
  it('shows the sign-in facts of an account and the buttons that manage it', async () => {
    await openCustomer(1, DANIEL, { tab: 'account' });
    const panel = within(screen.getByRole('tabpanel'));
    expect(await panel.findByText('Signed up on the storefront')).toBeInTheDocument();
    expect(panel.getByText('Verified')).toBeInTheDocument();
    expect(panel.getByText(/^Changed /)).toBeInTheDocument();
    expect(panel.getByText('1 device')).toBeInTheDocument();
    expect(panel.getByText('203.0.113.177')).toBeInTheDocument();
    for (const name of ['Edit details', 'Password…', 'Sign out everywhere', 'Suspend…']) {
      expect(panel.getByRole('button', { name })).toBeEnabled();
    }
    expect(panel.queryByRole('button', { name: 'Create account…' })).not.toBeInTheDocument();
    expect(panel.getByText(/Nobody on your team can read a customer’s password/)).toBeInTheDocument();
  });

  it('shows a guest as a guest: no password, a note on what that means, and Create account…', async () => {
    await openCustomer(2, /Sofia Alvarez/, { tab: 'account' });
    expect(await screen.findByText('Bought as a guest')).toBeInTheDocument();
    expect(screen.getByText(/A guest has no password and no sign-in/)).toBeInTheDocument();
    expect(screen.queryByText('Password')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create account…' })).toBeEnabled();
    expect(screen.queryByRole('button', { name: 'Password…' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Sign out everywhere' })).not.toBeInTheDocument();
  });

  it('turns Sign out everywhere off for an account with no sessions', async () => {
    await openCustomer(18, /Hannah Weber/, { tab: 'account' });
    const panel = within(screen.getByRole('tabpanel'));
    expect(await panel.findByText('No active sessions')).toBeInTheDocument();
    expect(panel.getByRole('button', { name: 'Sign out everywhere' })).toBeDisabled();
    // A suspended account offers Reactivate, not Suspend.
    expect(panel.getByRole('button', { name: 'Reactivate' })).toBeEnabled();
    expect(panel.queryByRole('button', { name: 'Suspend…' })).not.toBeInTheDocument();
  });

  it('offers "Block IP…" for an address the server would not refuse, prefilled for the storefront', async () => {
    const user = userEvent.setup();
    await openCustomer(1, DANIEL, { tab: 'account' });
    await user.click(await screen.findByRole('button', { name: 'Block IP…' }));
    const dialog = await screen.findByRole('dialog', { name: 'Block an IP' });
    expect(within(dialog).getByLabelText('IP address or range')).toHaveValue('203.0.113.177');
    expect(within(dialog).getByLabelText('Who it applies to')).toHaveValue('store');
    expect(within(dialog).getByText(/Last used by Daniel Whitmore/)).toBeInTheDocument();
  });

  it('marks an address the server refuses, and links to the rule instead of offering to block it', async () => {
    await openCustomer(19, JACK, { tab: 'account' });
    const panel = within(screen.getByRole('tabpanel'));
    // A guest has no session address, so the address of the checkout stands in.
    expect(await panel.findByText('192.0.2.77')).toBeInTheDocument();
    expect(await panel.findByText('Blocked')).toBeInTheDocument();
    expect(panel.getByRole('link', { name: 'See the rule' })).toHaveAttribute('href', '/access?tab=block');
    expect(panel.queryByRole('button', { name: 'Block IP…' })).not.toBeInTheDocument();
  });

  it('says the account is gone for an anonymised customer', async () => {
    mockServer.use(
      http.get('*/admin/customers/:id', () =>
        HttpResponse.json(
          customerDetail({
            id: 4,
            name: 'Deleted customer',
            email: 'deleted-4@redacted.invalid',
            status: 'anonymized',
            hasAccount: false,
            account: null,
            country: 'FR',
          }),
        ),
      ),
    );
    await openCustomer(4, /Deleted customer/, { tab: 'account' });
    expect(
      await screen.findByText('This customer was anonymised. There is no account left to manage.'),
    ).toBeInTheDocument();
    expect(screen.getByText(/^Personal data removed · France · customer since/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Edit details' })).not.toBeInTheDocument();
  });
});

describe('Support tab', () => {
  it('lists the customer’s tickets (from the support feature) and links to them in Support', async () => {
    await openCustomer(10, TYLER, { tab: 'support' });
    expect(await screen.findByRole('link', { name: 'Open in Support' }, { timeout: 10_000 })).toHaveAttribute(
      'href',
      '/support?customerId=10',
    );
  });

  it('says so when the customer never contacted support', async () => {
    await openCustomer(1, DANIEL, { tab: 'support' });
    expect(await screen.findByText('No tickets')).toBeInTheDocument();
    expect(screen.getByText('This customer has never contacted support.')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Open in Support' })).not.toBeInTheDocument();
  });
});

describe('Consents and data tab', () => {
  it('lists the consent records of the latest order and the privacy facts', async () => {
    await openCustomer(1, DANIEL, { tab: 'consents' });
    expect(await screen.findByText('Consent record for the latest order (SF-20485)')).toBeInTheDocument();
    for (const text of [
      'Terms of service v3.2',
      'Privacy policy v2.1',
      'Refund policy v1.4',
      'Digital service starts now, right of withdrawal is waived',
    ]) {
      expect(screen.getByText(text)).toBeInTheDocument();
    }
    expect(screen.queryByText('Marketing emails (opt-in)')).not.toBeInTheDocument();
    expect(screen.getAllByText(/IP 203\.0\.113\.177/)).toHaveLength(4);
    expect(screen.getByText(/stored with the order/)).toBeInTheDocument();
    expect(screen.getByText('Not opted in')).toBeInTheDocument();
    expect(screen.getByText('Kept for 180 days after the order, then removed')).toBeInTheDocument();
    expect(await screen.findByText('None')).toBeInTheDocument();
  });

  it('adds the marketing opt-in to the records for a customer who agreed to it', async () => {
    await openCustomer(3, /Lukas Brandt/, { tab: 'consents' });
    expect(await screen.findByText('Marketing emails (opt-in)')).toBeInTheDocument();
    expect(screen.getByText('Opted in')).toBeInTheDocument();
  });

  it('lists the customer’s data requests, done and open', async () => {
    await openCustomer(4, /Emma Dubois/, { tab: 'consents' });
    expect(await screen.findByText(/^DSR-31 · Data export · Done /)).toBeInTheDocument();
  });

  it('says there was no consent to record when the customer has no orders', async () => {
    await openCustomer(16, /Mia Schneider/, { tab: 'consents' });
    expect(await screen.findByText('No orders, so no consent was recorded.')).toBeInTheDocument();
    expect(await screen.findByText(/^DSR-32 · Erasure ·/)).toHaveTextContent(
      'DSR-32 · Erasure · Open, due in 27d',
    );
  });

  it('leaves out the rows the staff member cannot read, and disables the privacy buttons', async () => {
    await openCustomer(1, DANIEL, { tab: 'consents', permissions: ['customers:read'] });
    expect(await screen.findByText('Marketing emails')).toBeInTheDocument();
    expect(screen.queryByText('IMEI storage')).not.toBeInTheDocument();
    expect(screen.queryByText('Requests')).not.toBeInTheDocument();
    for (const name of ['Export their data', 'Anonymise…']) {
      expect(screen.getByRole('button', { name })).toBeDisabled();
      expect(screen.getByRole('button', { name })).toHaveAttribute(
        'title',
        'You need the customers:privacy permission',
      );
    }
  });
});

describe('Risk tab', () => {
  it('shows the level, status, notes and highest score, and the signals with a link to each order', async () => {
    await openCustomer(19, JACK, { tab: 'risk' });
    const level = await screen.findByText('Risk level');
    expect(level.nextElementSibling).toHaveTextContent('High');
    expect(screen.getByText('Status').nextElementSibling).toHaveTextContent('Blocked');
    expect(screen.getByText(/Chargeback lost on SF-20400/)).toBeInTheDocument();
    expect(screen.getByText('71')).toBeInTheDocument();
    expect(screen.getByText('Email on a previous chargeback')).toBeInTheDocument();
    expect(screen.getByText('Disposable email domain')).toBeInTheDocument();
    const links = screen.getAllByRole('link', { name: 'SF-20400' });
    expect(links).toHaveLength(2);
    expect(links[0]).toHaveAttribute('href', '/orders?order=20400');
  });

  it('says there were no signals, and a dash for the score, when there are no orders', async () => {
    await openCustomer(2, /Sofia Alvarez/, { tab: 'risk' });
    expect(await screen.findByText('No risk signals on any order.')).toBeInTheDocument();
    expect(screen.getByText('Highest score').nextElementSibling).toHaveTextContent('–');
    expect(screen.getByText('None')).toBeInTheDocument();
  });

  it('shows the score of the riskiest order even when no order raised a signal', async () => {
    await openCustomer(1, DANIEL, { tab: 'risk' });
    expect(await screen.findByText('No risk signals on any order.')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText('24')).toBeInTheDocument());
  });
});
