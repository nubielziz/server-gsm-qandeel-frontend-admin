// Tests for the Payment methods tab, run through the whole app against the dev mock API: the cards, the on/off switch with a server
// refusal, the check before the last storefront method goes off, add and edit (write-only secret, only changes sent), delete, permissions.
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http } from 'msw';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mockServer } from '@/mocks/node';
import { problem } from '@/mocks/problem';
import { setupMockApi } from '@/test/renderApp';
import { getGateway, listGateways } from '../api';
import { dialogOf, openSettings } from '../test/settingsPage';
import { recordRequests } from '../test/requests';

setupMockApi();
vi.setConfig({ testTimeout: 20_000 });
afterEach(() => vi.restoreAllMocks());

/** A gateway card by its name. */
const card = async (name: string) => within(await screen.findByRole('article', { name }));

describe('the cards', () => {
  it('shows each payment method with its audience, mode, fee, limits and merchant groups', async () => {
    await openSettings();
    const gateway = await card('Card gateway');
    expect(gateway.getByText('B2C')).toBeInTheDocument();
    expect(gateway.getByText('Live')).toBeInTheDocument();
    expect(gateway.getByText('2.9% + $0.30')).toBeInTheDocument();
    expect(gateway.getByText('$1.00 to $2,000.00')).toBeInTheDocument();
    expect(gateway.getByText('Sent back automatically')).toBeInTheDocument();
    expect(gateway.getByText('Required')).toBeInTheDocument();
    expect(gateway.getByText('$1,313')).toBeInTheDocument();
    const bank = await card('Bank transfer');
    expect(bank.getByText('B2B')).toBeInTheDocument();
    expect(bank.getByText('Manual')).toBeInTheDocument();
    expect(bank.getByText('Free')).toBeInTheDocument();
    expect(bank.getByText('By hand')).toBeInTheDocument();
    expect(await bank.findByText('Wholesale, VIP')).toBeInTheDocument();
  });
});

describe('the on/off switch', () => {
  it('turns a payment method off and says what changed', async () => {
    const user = userEvent.setup();
    await openSettings();
    const crypto = await card('Crypto gateway');
    await user.click(crypto.getByRole('switch', { name: 'Turn off Crypto gateway' }));
    expect(await screen.findByText('Crypto gateway is off')).toBeInTheDocument();
    expect(screen.getByText('It no longer shows at checkout.')).toBeInTheDocument();
    await waitFor(async () =>
      expect((await card('Crypto gateway')).getByRole('switch')).toHaveAttribute('aria-checked', 'false'),
    );
    expect((await getGateway(2)).isActive).toBe(false);
  });

  it('shows the server’s refusal and leaves the switch where it was', async () => {
    const user = userEvent.setup();
    mockServer.use(
      http.patch('*/admin/payment-gateways/:id', () =>
        problem(
          409,
          'SETTLEMENT_PENDING',
          'Cannot change this method',
          'A settlement is still open for Crypto gateway.',
        ),
      ),
    );
    await openSettings();
    const crypto = await card('Crypto gateway');
    await user.click(crypto.getByRole('switch', { name: 'Turn off Crypto gateway' }));
    expect(await screen.findByText('Cannot change this method')).toBeInTheDocument();
    expect(screen.getByText(/A settlement is still open for Crypto gateway\./)).toBeInTheDocument();
    expect((await card('Crypto gateway')).getByRole('switch')).toHaveAttribute('aria-checked', 'true');
    expect((await getGateway(2)).isActive).toBe(true);
  });

  it('asks before the last storefront method goes off, and warns once customers cannot pay', async () => {
    const user = userEvent.setup();
    await openSettings();
    await user.click((await card('Crypto gateway')).getByRole('switch', { name: 'Turn off Crypto gateway' }));
    await screen.findByText('Crypto gateway is off');
    expect(screen.queryByText('Customers can’t pay.')).not.toBeInTheDocument();
    // Card is now the only storefront method that is on.
    await user.click((await card('Card gateway')).getByRole('switch', { name: 'Turn off Card gateway' }));
    const dialog = dialogOf('Turn off the last storefront payment method?');
    expect(dialog.getByText(/Customers will not be able to pay/)).toBeInTheDocument();
    expect((await getGateway(1)).isActive).toBe(true);
    await user.click(dialog.getByRole('button', { name: 'Turn off' }));
    expect(await screen.findByText('Card gateway is off')).toBeInTheDocument();
    expect(await screen.findByText('Customers can’t pay.')).toBeInTheDocument();
    expect((await getGateway(1)).isActive).toBe(false);
  });

  it('turns a manual method that only merchants use off without asking', async () => {
    const user = userEvent.setup();
    await openSettings();
    await user.click((await card('Wise')).getByRole('switch', { name: 'Turn off Wise' }));
    expect(await screen.findByText('Wise is off')).toBeInTheDocument();
  });
});

describe('Add payment method', () => {
  it('sends the secret once and shows only its hint afterwards', async () => {
    const user = userEvent.setup();
    const recorder = recordRequests();
    await openSettings();
    await user.click(await screen.findByRole('button', { name: 'Add payment method' }));
    const dialog = dialogOf('Add payment method');
    await user.type(dialog.getByRole('textbox', { name: 'Name' }), 'PayPal');
    await user.type(dialog.getByRole('textbox', { name: 'Code' }), 'paypal');
    await user.type(dialog.getByRole('textbox', { name: 'Driver' }), 'paypal');
    await user.clear(dialog.getByRole('textbox', { name: 'Fee (%)' }));
    await user.type(dialog.getByRole('textbox', { name: 'Fee (%)' }), '3.4');
    await user.type(dialog.getByLabelText('Secret (API key)'), 'sk_live_abcd1234');
    await user.click(await dialog.findByRole('checkbox', { name: 'Wholesale' }));
    await user.click(dialog.getByRole('button', { name: 'Add payment method' }));
    expect(await screen.findByText('PayPal added')).toBeInTheDocument();
    expect(recorder.to('POST', '/admin/payment-gateways')[0].body).toMatchObject({
      name: 'PayPal',
      code: 'paypal',
      feePercent: '3.4',
      secret: 'sk_live_abcd1234',
      allowedGroupIds: [2],
    });
    const paypal = await card('PayPal');
    expect(paypal.getByText('••••1234')).toBeInTheDocument();
    expect(paypal.getByText('3.4%')).toBeInTheDocument();
    expect(document.body.textContent).not.toContain('sk_live_abcd1234');
    expect('secret' in (await listGateways()).data.at(-1)!).toBe(false);
  });

  it('asks for the required fields before it calls the server', async () => {
    const user = userEvent.setup();
    await openSettings();
    await user.click(await screen.findByRole('button', { name: 'Add payment method' }));
    await user.click(dialogOf('Add payment method').getByRole('button', { name: 'Add payment method' }));
    expect(await dialogOf('Add payment method').findByText('Enter a name.')).toBeInTheDocument();
    expect(dialogOf('Add payment method').getByText('Enter a code.')).toBeInTheDocument();
    expect(dialogOf('Add payment method').getByText('Enter the driver.')).toBeInTheDocument();
  });

  it('puts the server’s messages under their fields', async () => {
    const user = userEvent.setup();
    await openSettings();
    await user.click(await screen.findByRole('button', { name: 'Add payment method' }));
    const dialog = dialogOf('Add payment method');
    await user.type(dialog.getByRole('textbox', { name: 'Name' }), 'Odd');
    await user.type(dialog.getByRole('textbox', { name: 'Code' }), 'card');
    await user.type(dialog.getByRole('textbox', { name: 'Driver' }), 'odd');
    await user.click(dialog.getByRole('button', { name: 'Add payment method' }));
    expect(await dialog.findByText('Another payment method already uses this code.')).toBeInTheDocument();
    expect(dialog.getByRole('textbox', { name: 'Code' })).toHaveAttribute('aria-invalid', 'true');
  });
});

describe('Edit payment method', () => {
  it('sends only what changed, and leaves the code alone', async () => {
    const user = userEvent.setup();
    const recorder = recordRequests();
    await openSettings();
    await user.click((await card('Card gateway')).getByRole('button', { name: 'Edit Card gateway' }));
    const dialog = dialogOf('Edit Card gateway');
    expect(dialog.getByRole('textbox', { name: 'Code' })).toHaveAttribute('readonly');
    expect(dialog.getByText(/Stored \(••••/)).toBeInTheDocument();
    await user.clear(dialog.getByRole('textbox', { name: 'Fee (%)' }));
    await user.type(dialog.getByRole('textbox', { name: 'Fee (%)' }), '3.1');
    await user.click(dialog.getByRole('button', { name: 'Save changes' }));
    expect(await screen.findByText('Card gateway saved')).toBeInTheDocument();
    expect(recorder.to('PATCH', '/admin/payment-gateways/1')[0].body).toEqual({ feePercent: '3.1' });
    expect((await card('Card gateway')).getByText('3.1% + $0.30')).toBeInTheDocument();
  });

  it('says so when nothing changed', async () => {
    const user = userEvent.setup();
    await openSettings();
    await user.click((await card('Wise')).getByRole('button', { name: 'Edit Wise' }));
    await user.click(dialogOf('Edit Wise').getByRole('button', { name: 'Save changes' }));
    expect(await screen.findByText('Nothing changed')).toBeInTheDocument();
  });
});

describe('Delete payment method', () => {
  it('shows the server’s refusal for a method that took payments lately', async () => {
    const user = userEvent.setup();
    await openSettings();
    await user.click((await card('Card gateway')).getByRole('button', { name: 'Delete Card gateway' }));
    await user.click(dialogOf('Delete Card gateway?').getByRole('button', { name: 'Delete payment method' }));
    expect(
      await dialogOf('Delete Card gateway?').findByText(
        'Card gateway took payments in the last 30 days. Turn it off instead of deleting it.',
      ),
    ).toBeInTheDocument();
    expect((await getGateway(1)).name).toBe('Card gateway');
  });

  it('deletes a method nobody used', async () => {
    const user = userEvent.setup();
    await openSettings();
    await user.click((await card('Wise')).getByRole('button', { name: 'Delete Wise' }));
    await user.click(dialogOf('Delete Wise?').getByRole('button', { name: 'Delete payment method' }));
    expect(await screen.findByText('Wise deleted')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole('article', { name: 'Wise' })).not.toBeInTheDocument());
  });
});

describe('permissions', () => {
  it('names the merchant groups by number when the role cannot read the groups', async () => {
    await openSettings('/settings', { permissions: ['payments:gateways'] });
    expect(await (await card('Bank transfer')).findByText('Group 2, Group 3')).toBeInTheDocument();
    expect((await card('Card gateway')).getByRole('switch', { name: 'Turn off Card gateway' })).toBeEnabled();
  });

  it('lets a role without the permission see no payment methods tab', async () => {
    await openSettings('/settings?tab=payments', { permissions: ['settings:read'] });
    expect(screen.queryByRole('tab', { name: 'Payment methods' })).not.toBeInTheDocument();
    expect(screen.queryByRole('article', { name: 'Card gateway' })).not.toBeInTheDocument();
  });
});

describe('the list', () => {
  it('says so, with a Retry, when the payment methods could not be loaded', async () => {
    const user = userEvent.setup();
    mockServer.use(
      http.get('*/admin/payment-gateways', () =>
        problem(500, 'INTERNAL', 'Server error', 'The gateways are down.'),
      ),
    );
    await openSettings();
    expect(await screen.findByText('Could not load the payment methods')).toBeInTheDocument();
    mockServer.resetHandlers();
    await user.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByRole('article', { name: 'Card gateway' })).toBeInTheDocument();
  });

  it('shows an empty state when there are no payment methods', async () => {
    mockServer.use(
      http.get(
        '*/admin/payment-gateways',
        () => new Response('[]', { headers: { 'content-type': 'application/json', 'x-total-count': '0' } }),
      ),
    );
    await openSettings();
    expect(await screen.findByText('No payment methods')).toBeInTheDocument();
    expect(screen.getByText('Connect a card gateway to start selling.')).toBeInTheDocument();
  });
});
