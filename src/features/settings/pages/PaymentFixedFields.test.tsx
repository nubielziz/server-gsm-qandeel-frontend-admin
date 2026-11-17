// Tests for the driver and the manual setting of a method made from a ready-made one (feature 32, backend B232): both are fixed, in the edit
// dialog of such a method and in the add dialog opened from the gallery, and free for a custom method. The server refuses a change of either
// (422 `driver` and `isManual`), and its message still shows under the field if it ever comes.
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http } from 'msw';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mockServer } from '@/mocks/node';
import { problem } from '@/mocks/problem';
import { setupMockApi, signInAs } from '@/test/renderApp';
import { createGateway } from '../api';
import { dialogOf, openSettings } from '../test/settingsPage';
import { recordRequests } from '../test/requests';

setupMockApi();
vi.setConfig({ testTimeout: 20_000 });
afterEach(() => vi.restoreAllMocks());

const HINT = 'Set by the ready-made method; it cannot change.';
const MANUAL = 'A person checks each payment (manual)';

/** A Vodafone Cash method made from its entry. */
const addVodafone = () =>
  createGateway({
    code: 'vodafone_cash',
    driver: 'vodafone_cash',
    name: 'Vodafone Cash',
    audience: 'both',
    feePercent: '0',
    feeFixed: '0',
    minAmount: '0',
    maxAmount: '0',
    allowedGroupIds: [],
    supportsRefunds: false,
    supports3ds: false,
    isManual: true,
    instructions: 'Send to 0100.',
    holdHours: 0,
    isActive: false,
    preset: 'vodafone_cash',
  });

type Dialog = ReturnType<typeof within>;

/** Both fields are fixed: the driver is read-only and says why, the manual box is aria-disabled, checked, and does not change. */
async function expectFixed(user: ReturnType<typeof userEvent.setup>, dialog: Dialog) {
  const driver = dialog.getByRole('textbox', { name: 'Driver' });
  const manual = dialog.getByRole('checkbox', { name: MANUAL });
  expect(driver).toHaveAttribute('readonly');
  expect(driver).toHaveValue('vodafone_cash');
  expect(manual).toHaveAttribute('aria-disabled', 'true');
  expect(manual).not.toBeDisabled();
  expect(manual).toBeChecked();
  expect(dialog.getAllByText(HINT)).toHaveLength(2);
  // Typing, a mouse click on the box or on its label, and the space key change nothing.
  await user.type(driver, 'changed');
  expect(driver).toHaveValue('vodafone_cash');
  await user.click(manual);
  expect(manual).toBeChecked();
  await user.click(dialog.getByText(MANUAL));
  expect(manual).toBeChecked();
  manual.focus();
  await user.keyboard(' ');
  expect(manual).toBeChecked();
}

describe('a method made from a ready-made one', () => {
  it('has its driver and its manual setting fixed in the edit dialog, and still sends the rest', async () => {
    const user = userEvent.setup();
    const recorder = recordRequests();
    await signInAs();
    await addVodafone();
    await openSettings();
    await user.click(
      within(await screen.findByRole('article', { name: 'Vodafone Cash' })).getByRole('button', {
        name: 'Edit Vodafone Cash',
      }),
    );
    const dialog = dialogOf('Edit Vodafone Cash');
    await expectFixed(user, dialog);
    await user.type(dialog.getByRole('textbox', { name: 'Name' }), ' (Egypt)');
    await user.click(dialog.getByRole('button', { name: 'Save changes' }));
    expect(await screen.findByText('Vodafone Cash (Egypt) saved')).toBeInTheDocument();
    // The fixed fields did not change, so they are not in the edit.
    expect(recorder.to('PATCH', '/admin/payment-gateways/5')[0]?.body).toEqual({
      name: 'Vodafone Cash (Egypt)',
    });
  });

  it('has them fixed in the add dialog opened from the gallery, and sends both as the entry has them', async () => {
    const user = userEvent.setup();
    const recorder = recordRequests();
    await openSettings();
    const gallery = within(await screen.findByRole('region', { name: 'Ready-made methods' }));
    await user.click(await gallery.findByRole('button', { name: 'Add Vodafone Cash' }));
    const dialog = dialogOf('Add Vodafone Cash');
    await expectFixed(user, dialog);
    await user.click(dialog.getByRole('button', { name: 'Add payment method' }));
    expect(await screen.findByText('Vodafone Cash added')).toBeInTheDocument();
    expect(recorder.to('POST', '/admin/payment-gateways')[0].body).toMatchObject({
      preset: 'vodafone_cash',
      driver: 'vodafone_cash',
      isManual: true,
    });
  });

  it('shows the server’s refusal under the driver if it ever comes', async () => {
    const user = userEvent.setup();
    mockServer.use(
      http.patch('*/admin/payment-gateways/:id', () =>
        problem(422, 'VALIDATION_FAILED', 'Check the form', 'Some fields need attention.', [
          { field: 'driver', message: 'The driver of Vodafone Cash is "vodafone_cash".' },
        ]),
      ),
    );
    await signInAs();
    await addVodafone();
    await openSettings();
    await user.click(
      within(await screen.findByRole('article', { name: 'Vodafone Cash' })).getByRole('button', {
        name: 'Edit Vodafone Cash',
      }),
    );
    const dialog = dialogOf('Edit Vodafone Cash');
    await user.type(dialog.getByRole('textbox', { name: 'Name' }), ' 2');
    await user.click(dialog.getByRole('button', { name: 'Save changes' }));
    expect(await dialog.findByText('The driver of Vodafone Cash is "vodafone_cash".')).toBeInTheDocument();
    expect(dialog.getByRole('textbox', { name: 'Driver' })).toHaveAttribute('aria-invalid', 'true');
  });
});

describe('a custom method', () => {
  it('keeps its driver and its manual setting free in the edit dialog', async () => {
    const user = userEvent.setup();
    const recorder = recordRequests();
    await openSettings();
    await user.click(
      within(await screen.findByRole('article', { name: 'Card gateway' })).getByRole('button', {
        name: 'Edit Card gateway',
      }),
    );
    const dialog = dialogOf('Edit Card gateway');
    const driver = dialog.getByRole('textbox', { name: 'Driver' });
    const manual = dialog.getByRole('checkbox', { name: MANUAL });
    expect(driver).not.toHaveAttribute('readonly');
    expect(manual).not.toHaveAttribute('aria-disabled');
    expect(dialog.queryByText(HINT)).not.toBeInTheDocument();
    await user.clear(driver);
    await user.type(driver, 'paypal');
    await user.click(manual);
    expect(manual).toBeChecked();
    await user.click(dialog.getByRole('button', { name: 'Save changes' }));
    expect(await screen.findByText('Card gateway saved')).toBeInTheDocument();
    expect(recorder.to('PATCH', '/admin/payment-gateways/1')[0].body).toEqual({
      driver: 'paypal',
      isManual: true,
    });
  });

  it('keeps them free in the Add custom method dialog', async () => {
    const user = userEvent.setup();
    await openSettings();
    await user.click(await screen.findByRole('button', { name: 'Add custom method' }));
    const dialog = dialogOf('Add payment method');
    await user.type(dialog.getByRole('textbox', { name: 'Driver' }), 'cliq');
    expect(dialog.getByRole('textbox', { name: 'Driver' })).toHaveValue('cliq');
    await user.click(dialog.getByRole('checkbox', { name: MANUAL }));
    expect(dialog.getByRole('checkbox', { name: MANUAL })).toBeChecked();
    expect(dialog.queryByText(HINT)).not.toBeInTheDocument();
  });
});
