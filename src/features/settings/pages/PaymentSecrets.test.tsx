// Tests for the webhook secret fields of the payment method dialog (24C): write-only fields, the stored hints, a changed-only body,
// removing the second secret, the server's 422 under the field and the webhook address, run through the whole app against the mock API.
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { setupMockApi } from '@/test/renderApp';
import { getGateway } from '../api';
import { dialogOf, openSettings } from '../test/settingsPage';
import { recordRequests } from '../test/requests';
import { within } from '@testing-library/react';

setupMockApi();
vi.setConfig({ testTimeout: 20_000 });
afterEach(() => vi.restoreAllMocks());

const card = async (name: string) => within(await screen.findByRole('article', { name }));

/** Opens the edit dialog of a gateway. */
async function openEdit(user: ReturnType<typeof userEvent.setup>, name: string) {
  await openSettings();
  await user.click((await card(name)).getByRole('button', { name: `Edit ${name}` }));
  return dialogOf(`Edit ${name}`);
}

describe('Webhook secrets in the payment method dialog', () => {
  it('shows what is stored, and the address to register at the provider', async () => {
    const user = userEvent.setup();
    const dialog = await openEdit(user, 'Card gateway');
    // The API key and the webhook signing secret are stored; the second webhook secret is not.
    expect(dialog.getAllByText(/Stored \(••••[0-9a-f]{3,4}\)\. Write-only/)).toHaveLength(2);
    expect(dialog.getByLabelText('Webhook signing secret')).toHaveValue('');
    expect(dialog.getByLabelText('Second webhook secret (optional)')).toHaveValue('');
    expect(dialog.getByText('For a second endpoint or while rotating the secret.')).toBeInTheDocument();
    expect(dialog.getByText('/webhooks/payments/card')).toBeInTheDocument();
    expect(dialog.getByRole('button', { name: 'Copy webhook address' })).toBeInTheDocument();
    expect(dialog.queryByRole('button', { name: /Remove the second/ })).not.toBeInTheDocument();
  });

  it('has no webhook fields for a manual method', async () => {
    const user = userEvent.setup();
    const dialog = await openEdit(user, 'Wise');
    expect(dialog.getByLabelText('Secret (API key)')).toBeInTheDocument();
    expect(dialog.queryByLabelText('Webhook signing secret')).not.toBeInTheDocument();
    expect(dialog.queryByText(/\/webhooks\/payments\//)).not.toBeInTheDocument();
  });

  it('sends a typed webhook secret once and shows only its hint afterwards', async () => {
    const user = userEvent.setup();
    const recorder = recordRequests();
    const dialog = await openEdit(user, 'Card gateway');
    await user.type(dialog.getByLabelText('Webhook signing secret'), 'whsec_live_9f3k');
    await user.click(dialog.getByRole('button', { name: 'Save changes' }));
    expect(await screen.findByText('Card gateway saved')).toBeInTheDocument();
    expect(recorder.to('PATCH', '/admin/payment-gateways/1')[0].body).toEqual({
      webhookSecret: 'whsec_live_9f3k',
    });
    expect((await getGateway(1)).webhookSecretHint).toBe('••••9f3k');
    expect((await card('Card gateway')).getByText('••••9f3k')).toBeInTheDocument();
    expect(document.body.textContent).not.toContain('whsec_live_9f3k');
  });

  it('trims a pasted webhook secret before it is sent', async () => {
    const user = userEvent.setup();
    const recorder = recordRequests();
    const dialog = await openEdit(user, 'Card gateway');
    await user.type(dialog.getByLabelText('Webhook signing secret'), '  whsec_x_1234  ');
    await user.click(dialog.getByRole('button', { name: 'Save changes' }));
    expect(await screen.findByText('Card gateway saved')).toBeInTheDocument();
    expect(recorder.to('PATCH', '/admin/payment-gateways/1')[0].body).toEqual({
      webhookSecret: 'whsec_x_1234',
    });
    expect((await getGateway(1)).webhookSecretHint).toBe('••••1234');
  });

  it('does not send a whitespace-only webhook secret', async () => {
    const user = userEvent.setup();
    const recorder = recordRequests();
    const dialog = await openEdit(user, 'Card gateway');
    await user.type(dialog.getByLabelText('Webhook signing secret'), '   ');
    await user.click(dialog.getByRole('button', { name: 'Save changes' }));
    expect(await screen.findByText('Nothing changed')).toBeInTheDocument();
    expect(recorder.to('PATCH', '/admin/payment-gateways/1')).toHaveLength(0);
  });

  it('sets the second secret, keeps it when the first is replaced, and removes it with null', async () => {
    const user = userEvent.setup();
    const recorder = recordRequests();
    let dialog = await openEdit(user, 'Card gateway');
    await user.type(dialog.getByLabelText('Second webhook secret (optional)'), '  whsec_two_ab12  ');
    await user.click(dialog.getByRole('button', { name: 'Save changes' }));
    await screen.findByText('Card gateway saved');
    expect(recorder.to('PATCH', '/admin/payment-gateways/1')[0].body).toEqual({
      secondaryWebhookSecret: 'whsec_two_ab12',
    });
    expect((await getGateway(1)).secondaryWebhookSecretHint).toBe('••••ab12');

    await user.click((await card('Card gateway')).getByRole('button', { name: 'Edit Card gateway' }));
    dialog = dialogOf('Edit Card gateway');
    expect(dialog.getByText(/Stored \(••••ab12\)/)).toBeInTheDocument();
    await user.type(dialog.getByLabelText('Webhook signing secret'), 'whsec_new_cd34');
    await user.click(dialog.getByRole('button', { name: 'Save changes' }));
    await screen.findAllByText('Card gateway saved');
    expect(recorder.to('PATCH', '/admin/payment-gateways/1')[1].body).toEqual({
      webhookSecret: 'whsec_new_cd34',
    });
    expect(await getGateway(1)).toMatchObject({
      webhookSecretHint: '••••cd34',
      secondaryWebhookSecretHint: '••••ab12',
    });

    await user.click((await card('Card gateway')).getByRole('button', { name: 'Edit Card gateway' }));
    dialog = dialogOf('Edit Card gateway');
    await user.click(dialog.getByRole('button', { name: 'Remove the second webhook secret' }));
    expect(dialog.getByText(/is removed when you save/)).toBeInTheDocument();
    await user.click(dialog.getByRole('button', { name: 'Save changes' }));
    await vi.waitFor(async () => expect((await getGateway(1)).secondaryWebhookSecretHint).toBeNull());
    expect(recorder.to('PATCH', '/admin/payment-gateways/1')[2].body).toEqual({
      secondaryWebhookSecret: null,
    });
    expect((await getGateway(1)).webhookSecretHint).toBe('••••cd34');
  });

  it('lets the person change their mind about Remove', async () => {
    const user = userEvent.setup();
    const recorder = recordRequests();
    let dialog = await openEdit(user, 'Card gateway');
    await user.type(dialog.getByLabelText('Second webhook secret (optional)'), 'whsec_two_ab12');
    await user.click(dialog.getByRole('button', { name: 'Save changes' }));
    await screen.findByText('Card gateway saved');
    await user.click((await card('Card gateway')).getByRole('button', { name: 'Edit Card gateway' }));
    dialog = dialogOf('Edit Card gateway');
    await user.click(dialog.getByRole('button', { name: 'Remove the second webhook secret' }));
    await user.click(dialog.getByRole('button', { name: 'Keep the second webhook secret' }));
    await user.click(dialog.getByRole('button', { name: 'Save changes' }));
    expect(await screen.findByText('Nothing changed')).toBeInTheDocument();
    expect(recorder.to('PATCH', '/admin/payment-gateways/1')).toHaveLength(1);
  });

  it('adds a method with both secrets in the create body', async () => {
    const user = userEvent.setup();
    const recorder = recordRequests();
    await openSettings();
    await user.click(await screen.findByRole('button', { name: 'Add custom method' }));
    const dialog = dialogOf('Add payment method');
    await user.type(dialog.getByRole('textbox', { name: 'Name' }), 'Stripe');
    await user.selectOptions(dialog.getByRole('combobox', { name: 'Driver' }), 'Card');
    expect(
      dialog.getByText('None stored: the gateway’s confirmations are refused until one is set.'),
    ).toBeInTheDocument();
    // The webhook address contains the code, which the server makes when the method is saved.
    expect(dialog.queryByText(/\/webhooks\/payments\//)).not.toBeInTheDocument();
    expect(dialog.getByText(/Made when you save/)).toBeInTheDocument();
    await user.type(dialog.getByLabelText('Webhook signing secret'), 'whsec_a_1111');
    await user.type(dialog.getByLabelText('Second webhook secret (optional)'), 'whsec_b_2222');
    await user.click(dialog.getByRole('button', { name: 'Add payment method' }));
    expect(await screen.findByText('Stripe added')).toBeInTheDocument();
    expect(recorder.to('POST', '/admin/payment-gateways')[0].body).not.toHaveProperty('code');
    expect(recorder.to('POST', '/admin/payment-gateways')[0].body).toMatchObject({
      webhookSecret: 'whsec_a_1111',
      secondaryWebhookSecret: 'whsec_b_2222',
    });
    const stripe = await card('Stripe');
    expect(stripe.getByText('••••1111')).toBeInTheDocument();
    expect(stripe.getByText(/••••2222/)).toBeInTheDocument();
  });

  it('puts the server’s 422 for a second secret without a first under that field', async () => {
    const user = userEvent.setup();
    await openSettings();
    await user.click(await screen.findByRole('button', { name: 'Add custom method' }));
    const dialog = dialogOf('Add payment method');
    await user.type(dialog.getByRole('textbox', { name: 'Name' }), 'Stripe');
    await user.selectOptions(dialog.getByRole('combobox', { name: 'Driver' }), 'Card');
    await user.type(dialog.getByLabelText('Second webhook secret (optional)'), 'whsec_b_2222');
    await user.click(dialog.getByRole('button', { name: 'Add payment method' }));
    expect(
      await dialog.findByText('Set the webhook signing secret before a second one.'),
    ).toBeInTheDocument();
    expect(dialog.getByLabelText('Second webhook secret (optional)')).toHaveAttribute('aria-invalid', 'true');
  });
});
