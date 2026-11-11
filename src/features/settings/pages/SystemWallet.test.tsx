// Tests for the Customer wallet panel of the System tab, run through the whole app against the dev mock API: the switches save at once
// through `PATCH /admin/settings`, a number saves on its own, the server's message shows under its field, and a reader cannot change them.
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http } from 'msw';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mockServer } from '@/mocks/node';
import { problem } from '@/mocks/problem';
import { setupMockApi } from '@/test/renderApp';
import { getSettings } from '../api';
import { openSettings } from '../test/settingsPage';
import { recordRequests } from '../test/requests';

setupMockApi();
vi.setConfig({ testTimeout: 20_000 });
afterEach(() => vi.restoreAllMocks());

const SYSTEM = '/settings?tab=system';

async function panel() {
  const heading = await screen.findByRole('heading', { name: 'Customer wallet' });
  return within(heading.closest('section') as HTMLElement);
}

describe('the Customer wallet panel', () => {
  it('shows the eight settings, with the master switch on and the card switch off', async () => {
    await openSettings(SYSTEM);
    const wallet = await panel();
    expect(wallet.getByRole('switch', { name: 'Turn off: Store balance' })).toBeChecked();
    expect(wallet.getByRole('switch', { name: 'Turn on: Card top-ups' })).not.toBeChecked();
    for (const label of [
      'Smallest top-up',
      'Largest top-up',
      'Highest balance',
      'Top-ups per day',
      'Top-up amount per day',
      'Adjust approval limit',
    ]) {
      expect(wallet.getByRole('textbox', { name: new RegExp(`^${label}`) })).toBeInTheDocument();
    }
  });

  it('saves a switch at once as one key', async () => {
    const user = userEvent.setup();
    const recorder = recordRequests();
    await openSettings(SYSTEM);
    const wallet = await panel();
    await user.click(wallet.getByRole('switch', { name: 'Turn on: Card top-ups' }));
    expect(await screen.findByText('Setting saved')).toBeInTheDocument();
    expect(recorder.to('PATCH', '/admin/settings')[0].body).toEqual({ 'wallet.customer.card_topups': true });
    expect((await getSettings())['wallet.customer.card_topups']).toBe(true);
  });

  it('saves one number on its own, checking the range first', async () => {
    const user = userEvent.setup();
    const recorder = recordRequests();
    await openSettings(SYSTEM);
    const wallet = await panel();
    const box = wallet.getByRole('textbox', { name: /^Top-ups per day/ });
    await user.type(box, '500');
    await user.click(within(box.closest('li') as HTMLElement).getByRole('button', { name: 'Save' }));
    expect(await screen.findByText('Enter 1 to 100.')).toBeInTheDocument();
    expect(recorder.to('PATCH', '/admin/settings')).toHaveLength(0);

    await user.clear(box);
    await user.type(box, '8');
    await user.click(within(box.closest('li') as HTMLElement).getByRole('button', { name: 'Save' }));
    expect(await screen.findByText('Setting saved')).toBeInTheDocument();
    expect(recorder.to('PATCH', '/admin/settings')[0].body).toEqual({ 'wallet.customer.topups_per_day': 8 });
  });

  it('shows the server’s message under the field', async () => {
    const user = userEvent.setup();
    mockServer.use(
      http.patch('*/admin/settings', () =>
        problem(422, 'VALIDATION_FAILED', 'Check the form', 'Some fields need attention.', [
          { field: 'wallet.customer.max_topup', message: 'Keep the largest top-up above the smallest.' },
        ]),
      ),
    );
    await openSettings(SYSTEM);
    const wallet = await panel();
    const box = wallet.getByRole('textbox', { name: /^Largest top-up/ });
    await user.type(box, '3');
    await user.click(within(box.closest('li') as HTMLElement).getByRole('button', { name: 'Save' }));
    expect(await screen.findByText('Keep the largest top-up above the smallest.')).toBeInTheDocument();
  });

  it('lets a reader see the settings but not change them', async () => {
    await openSettings(SYSTEM, { permissions: ['settings:read'] });
    const wallet = await panel();
    const toggle = wallet.getByRole('switch', { name: 'Turn on: Card top-ups' });
    expect(toggle).toBeDisabled();
    expect(toggle).toHaveAttribute('title', 'You need the settings:update permission');
  });
});
