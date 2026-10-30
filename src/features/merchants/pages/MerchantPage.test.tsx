// Tests for a merchant's page header, run through the whole app against the dev mock API: the figures, the pending and suspended
// notes, approve / suspend / reactivate, the group menu, the credit limit, the wallet adjustment (with the server's refusals), a
// merchant that does not exist, and what a role without some permissions sees disabled.
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import { formatTitle } from '@/app/layout/useDocumentTitle';
import { mockServer } from '@/mocks/node';
import { problem } from '@/mocks/problem';
import { setupMockApi } from '@/test/renderApp';
import { installMerchantMocks } from '../test/installMerchantMocks';
import { openMerchant } from '../test/openMerchants';

setupMockApi();
installMerchantMocks();
// The page is a lazy chunk: the first test of a run waits for its modules to load, which is slow while the whole suite
// runs in parallel. Every flow here also goes through the mock API with real dialogs, so give them room.
vi.setConfig({ testTimeout: 30_000 });

const ZAIN = /Zain Mobile Hub/;
const ALGIERS = /Algiers Service Plus/;
const summary = () => within(screen.getByRole('region', { name: 'Summary' }));

describe('the header and the figures', () => {
  it('shows the name with its status, the country, email and when they joined, and puts the name in the breadcrumb', async () => {
    await openMerchant(1, ZAIN);
    const heading = screen.getByRole('heading', { level: 1 });
    expect(within(heading).getByText('Active')).toBeInTheDocument();
    // The mock dates the merchant 410 days back when its data is first read, a moment after the page asked for the time.
    expect(heading.parentElement).toHaveTextContent(
      /JO · ops@zainmobilehub\.example · Joined 4(09|10) days ago/,
    );
    const crumbs = screen.getByRole('navigation', { name: 'Breadcrumb' });
    expect(within(crumbs).getByRole('link', { name: 'Merchants' })).toHaveAttribute('href', '/merchants');
    expect(within(crumbs).getByText('Zain Mobile Hub')).toBeInTheDocument();
    await waitFor(() => expect(document.title).toBe(formatTitle('Zain Mobile Hub', 'Merchants')));
  });

  it('links to the merchant who referred them', async () => {
    await openMerchant(8, /Casablanca Unlock/);
    expect(screen.getByRole('link', { name: 'Zain Mobile Hub' })).toHaveAttribute('href', '/merchants/1');
  });

  it('shows the wallet, what can be spent, and the 30-day figures the server counted', async () => {
    await openMerchant(1, ZAIN);
    expect(await summary().findByText('$1,209.75')).toBeInTheDocument();
    expect(summary().getByText('$71.23 held in open orders')).toBeInTheDocument();
    expect(summary().getByText('$3,209.75')).toBeInTheDocument();
    expect(summary().getByText('Wallet plus $2,000 credit limit')).toBeInTheDocument();
    expect(summary().getByText(/^\d+ orders$/)).toBeInTheDocument();
    expect(summary().getByText(/% margin$/)).toBeInTheDocument();
    expect(summary().getByText('Completed ÷ (completed + rejected)')).toBeInTheDocument();
  });

  it('shows a wallet below zero in red', async () => {
    await openMerchant(17, /Sana'a Repair/);
    expect(await summary().findByText('-$81.95')).toHaveClass('text-crit-fg');
  });
});

describe('status', () => {
  it('says a pending merchant waits for approval, and approving updates the page', async () => {
    const user = userEvent.setup();
    await openMerchant(18, ALGIERS);
    const note = screen.getByRole('note');
    expect(within(note).getByText('Waiting for approval')).toBeInTheDocument();
    expect(
      within(note).getByText(
        'KYC is in review. The merchant cannot place orders until you approve the account.',
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Adjust wallet…' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Approve account' }));
    expect(await screen.findByText('Algiers Service Plus approved')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole('note')).not.toBeInTheDocument());
    expect(await screen.findByRole('button', { name: 'Suspend…' })).toBeInTheDocument();
    expect(within(screen.getByRole('heading', { level: 1 })).getByText('Active')).toBeInTheDocument();
  });

  it('suspends with a reason, then reactivates', async () => {
    const user = userEvent.setup();
    await openMerchant(1, ZAIN);
    await user.click(screen.getByRole('button', { name: 'Suspend…' }));
    const dialog = await screen.findByRole('dialog', { name: 'Suspend Zain Mobile Hub' });
    await user.click(within(dialog).getByRole('button', { name: 'Suspend merchant' }));
    expect(await within(dialog).findByText('Add a short reason.')).toBeInTheDocument();
    await user.type(within(dialog).getByLabelText('Reason'), 'Chargeback dispute');
    await user.click(within(dialog).getByRole('button', { name: 'Suspend merchant' }));

    expect(await screen.findByText('Zain Mobile Hub suspended')).toBeInTheDocument();
    const note = await screen.findByRole('note');
    expect(within(note).getByText('Suspended')).toBeInTheDocument();
    expect(within(screen.getByRole('heading', { level: 1 })).getByText('Suspended')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Reactivate' }));
    expect(await screen.findByText('Zain Mobile Hub reactivated')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole('note')).not.toBeInTheDocument());
  });

  it('sends the reason with the suspension and shows the server’s refusal in the dialog', async () => {
    const user = userEvent.setup();
    await openMerchant(1, ZAIN);
    let body: unknown;
    mockServer.use(
      http.patch('*/admin/clients/:id', async ({ request }) => {
        body = await request.json();
        return problem(409, 'LAST_ACTIVE', 'Cannot suspend', 'Zain Mobile Hub has open orders worth $71.23.');
      }),
    );
    await user.click(screen.getByRole('button', { name: 'Suspend…' }));
    const dialog = await screen.findByRole('dialog', { name: 'Suspend Zain Mobile Hub' });
    await user.type(within(dialog).getByLabelText('Reason'), '  Chargeback dispute ');
    await user.click(within(dialog).getByRole('button', { name: 'Suspend merchant' }));
    expect(
      await within(dialog).findByText('Zain Mobile Hub has open orders worth $71.23.'),
    ).toBeInTheDocument();
    expect(body).toEqual({ status: 'suspended', reason: 'Chargeback dispute' });
    expect(screen.queryByRole('note')).not.toBeInTheDocument();
  });

  it('says so for a merchant that does not exist, or an address that is not an id', async () => {
    await openMerchant(9999, 'Merchant not found');
    expect(await screen.findByText('No merchant with that ID')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to merchants' })).toHaveAttribute('href', '/merchants');
  });

  it('treats an address that is not a number as a merchant that does not exist', async () => {
    await openMerchant('abc', 'Merchant not found');
    expect(await screen.findByText('No merchant with that ID')).toBeInTheDocument();
  });
});

describe('group', () => {
  it('moves the merchant to another group from the menu, with the demo’s toast', async () => {
    const user = userEvent.setup();
    await openMerchant(1, ZAIN);
    await user.click(await screen.findByRole('button', { name: 'Group: VIP' }));
    const items = within(await screen.findByRole('menu', { name: 'Merchant group' })).getAllByRole(
      'menuitemradio',
    );
    expect(items.map((item) => item.textContent)).toEqual(['Standard', 'Wholesale (-4%)', 'VIP (-8%)']);
    expect(items[2]).toHaveAttribute('aria-checked', 'true');

    await user.click(items[1]);
    expect(await screen.findByText('Zain Mobile Hub moved to Wholesale')).toBeInTheDocument();
    expect(screen.getByText('New orders use the new prices.')).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: 'Group: Wholesale' })).toBeInTheDocument();
  });

  it('does nothing when the current group is chosen again', async () => {
    const user = userEvent.setup();
    await openMerchant(1, ZAIN);
    await user.click(await screen.findByRole('button', { name: 'Group: VIP' }));
    await user.click(await screen.findByRole('menuitemradio', { name: 'VIP (-8%)' }));
    expect(screen.queryByText(/moved to/)).not.toBeInTheDocument();
  });
});

describe('credit limit', () => {
  it('starts from the current limit, checks the amount, and the figures follow the new limit', async () => {
    const user = userEvent.setup();
    await openMerchant(1, ZAIN);
    await summary().findByText('$1,209.75');
    await user.click(screen.getByRole('button', { name: 'Credit limit…' }));
    const dialog = await screen.findByRole('dialog', { name: 'Credit limit for Zain Mobile Hub' });
    const field = within(dialog).getByLabelText('Credit limit (USD)');
    expect(field).toHaveValue('2000.00');
    await user.clear(field);
    await user.type(field, 'lots');
    await user.click(within(dialog).getByRole('button', { name: 'Save credit limit' }));
    expect(
      await within(dialog).findByText('Enter an amount like 500.00, or 0 for no credit.'),
    ).toBeInTheDocument();

    await user.clear(field);
    await user.type(field, '3,000');
    await user.click(within(dialog).getByRole('button', { name: 'Save credit limit' }));
    expect(await screen.findByText('Credit limit updated')).toBeInTheDocument();
    expect(screen.getByText('Zain Mobile Hub can now go $3,000.00 below zero.')).toBeInTheDocument();
    expect(await summary().findByText('Wallet plus $3,000 credit limit')).toBeInTheDocument();
    expect(summary().getByText('$4,209.75')).toBeInTheDocument();
  });
});

describe('adjust wallet', () => {
  async function openAdjust(user: ReturnType<typeof userEvent.setup>) {
    await openMerchant(1, ZAIN);
    await summary().findByText('$1,209.75');
    await user.click(screen.getByRole('button', { name: 'Adjust wallet…' }));
    return screen.findByRole('dialog', { name: 'Adjust wallet' });
  }

  it('checks the form, posts the entry, and shows the new balance in the toast and on the page', async () => {
    const user = userEvent.setup();
    const dialog = await openAdjust(user);
    expect(within(dialog).getByText('Zain Mobile Hub · balance $1,209.75')).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Post adjustment' }));
    expect(
      await within(dialog).findByText('Enter an amount greater than zero, like 25.00.'),
    ).toBeInTheDocument();
    expect(
      within(dialog).getByText('Add a reason of at least 5 characters so the entry can be audited later.'),
    ).toBeInTheDocument();

    await user.type(within(dialog).getByLabelText('Amount (USD)'), '25');
    await user.type(within(dialog).getByLabelText('Reason'), 'Refund for duplicate charge');
    await user.click(within(dialog).getByRole('button', { name: 'Post adjustment' }));
    expect(await screen.findByText('Credited $25.00')).toBeInTheDocument();
    expect(screen.getByText('Zain Mobile Hub balance is now $1,234.75.')).toBeInTheDocument();
    expect(await summary().findByText('$1,234.75')).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: 'Adjust wallet' })).not.toBeInTheDocument(),
    );
  });

  it('sends the amount as four-decimal text with the direction and the reason', async () => {
    const user = userEvent.setup();
    const dialog = await openAdjust(user);
    let body: unknown;
    mockServer.use(
      http.post('*/admin/clients/:id/wallet/adjust', async ({ request }) => {
        body = await request.json();
        return problem(409, 'X', 'Stop', 'Stopped here.');
      }),
    );
    await user.selectOptions(within(dialog).getByLabelText('Direction'), 'Debit (remove funds)');
    await user.type(within(dialog).getByLabelText('Amount (USD)'), '$1,000.5');
    await user.type(within(dialog).getByLabelText('Reason'), ' Duplicate top-up ');
    await user.click(within(dialog).getByRole('button', { name: 'Post adjustment' }));
    expect(await within(dialog).findByText('Stopped here.')).toBeInTheDocument();
    expect(body).toEqual({ amount: '1000.5000', direction: 'debit', reason: 'Duplicate top-up' });
  });

  it('shows the server’s refusal when a debit would pass the credit limit, and posts nothing', async () => {
    const user = userEvent.setup();
    const dialog = await openAdjust(user);
    await user.selectOptions(within(dialog).getByLabelText('Direction'), 'Debit (remove funds)');
    await user.type(within(dialog).getByLabelText('Amount (USD)'), '9000');
    await user.type(within(dialog).getByLabelText('Reason'), 'Chargeback reversal');
    await user.click(within(dialog).getByRole('button', { name: 'Post adjustment' }));
    expect(
      await within(dialog).findByText('This would take the wallet below the credit limit (-$2,000.00).'),
    ).toBeInTheDocument();
    expect(screen.getByRole('dialog', { name: 'Adjust wallet' })).toBeInTheDocument();
    expect(summary().getByText('$1,209.75')).toBeInTheDocument();
  });

  it('shows the server’s approval rule for a large adjustment', async () => {
    const user = userEvent.setup();
    const dialog = await openAdjust(user);
    await user.type(within(dialog).getByLabelText('Amount (USD)'), '10001');
    await user.type(within(dialog).getByLabelText('Reason'), 'Large correction');
    await user.click(within(dialog).getByRole('button', { name: 'Post adjustment' }));
    expect(
      await within(dialog).findByText(
        'Adjustments over $10,000 need a second approver. Split it or ask Finance.',
      ),
    ).toBeInTheDocument();
  });
});

describe('permissions', () => {
  it('disables every action the role lacks, names the missing permission, and leaves out the tabs it cannot read', async () => {
    await openMerchant(1, ZAIN, '', { permissions: ['clients:read'] });
    const lock = (name: string, permission: string) => {
      const button = screen.getByRole('button', { name });
      expect(button, name).toBeDisabled();
      expect(button, name).toHaveAttribute('title', `You need the ${permission} permission`);
    };
    lock('Adjust wallet…', 'wallet:adjust');
    lock('Credit limit…', 'wallet:credit_limit');
    lock('Suspend…', 'clients:update');
    lock('Group: VIP', 'clients:update');
    expect(await screen.findByText('Nothing here for your role')).toBeInTheDocument();
    expect(screen.queryByRole('tablist', { name: 'Merchant sections' })).not.toBeInTheDocument();
    // The wallet cannot be read, so its figures say why they are missing instead of showing a wrong number.
    expect(summary().getAllByText('Needs wallet:read')).toHaveLength(2);
  });

  it('says the group menu needs groups:read when the role may change groups but not list them', async () => {
    await openMerchant(1, ZAIN, '', { permissions: ['clients:read', 'clients:update'] });
    const button = screen.getByRole('button', { name: 'Group: VIP' });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('title', 'You need the groups:read permission to list the groups');
  });
});
